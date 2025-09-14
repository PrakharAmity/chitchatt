// prakharamity/chitchatt/chitchatt-main/app/page.tsx

"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';
import toast from 'react-hot-toast'; 

// 🔹 QR Scanner Component
function QrCodeScannerComponent({ onScanSuccess }: { onScanSuccess: (decodedText: string) => void }) {
    const handleScanSuccess = useCallback(onScanSuccess, [onScanSuccess]);

    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            'reader',
            {
                qrbox: { width: 250, height: 250 },
                fps: 5,
            },
            false
        );

        scanner.render(
            handleScanSuccess,
            (err: any) => console.warn("QR scan error:", err)
        );

        return () => {
            scanner.clear()
                .catch((err: any) => console.error("Failed to clear scanner.", err));
            const reader = document.getElementById('reader');
            if (reader) reader.innerHTML = '';
        };
    }, [handleScanSuccess]);

    return <div id="reader" className="w-full"></div>;
}

interface RoomData {
    room_code: string;
    qrCodeUrl: string;
}

export default function HomePage() {
    const [view, setView] = useState<'create' | 'join'>('create');
    const [duration, setDuration] = useState<number>(60);
    const [createdRoom, setCreatedRoom] = useState<RoomData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [joinCode, setJoinCode] = useState('');
    const router = useRouter();

    const handleCreateRoom = async () => {
        if (duration <= 0) {
            setError("Duration must be greater than 0.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setCreatedRoom(null);

        try {
            const response = await fetch('/api/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ duration_minutes: duration }),
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || 'Failed to create room.');
            }

            const data: RoomData = await response.json();
            
            // 🟢 CHANGE: Now we set the state instead of redirecting
            setCreatedRoom(data);
            
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinRoom = () => {
        if (!joinCode.trim()) return;

        const code = joinCode.trim().toUpperCase();
        if (!/^[A-Z0-9]{6}$/.test(code)) {
            setError("Invalid room code format.");
            return;
        }

        router.push(`/chat/${code}`);
    };
    
    // 🟢 NEW: Function to copy the room join link
    const handleCopyLink = () => {
        if (createdRoom?.room_code) {
            const joinUrl = `${window.location.origin}/chat/${createdRoom.room_code}`;
            navigator.clipboard.writeText(joinUrl)
                .then(() => toast.success("Room link copied to clipboard!"))
                .catch(() => toast.error("Failed to copy link."));
        }
    };
    
    // 🟢 NEW: Function to download the QR code image
    const handleDownloadQr = () => {
        if (createdRoom?.qrCodeUrl) {
            const link = document.createElement('a');
            link.href = createdRoom.qrCodeUrl;
            link.download = `chitchatt-${createdRoom.room_code}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("QR code downloaded!");
        }
    };
    

    const handleScanSuccess = (decodedText: string) => {
        let code = decodedText;

        try {
            const url = new URL(decodedText);
            code = url.pathname.split('/').pop() || code;
        } catch {
            // Not a URL, treat as plain code
        }

        if (code) router.push(`/chat/${code}`);
        else console.error("Invalid QR scan result:", decodedText);
    };

    return (
        <main className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg">

                {createdRoom ? (
                    <div className="text-center">
                        <h2 className="text-2xl font-bold">Room Created!</h2>
                        <p className="mt-2 text-gray-400">Share this code or QR code to join.</p>
                        <div className="p-4 mt-4 bg-gray-700 rounded-md">
                            <p className="text-lg font-medium">Room Code:</p>
                            <p className="text-4xl font-bold tracking-widest text-purple-400">
                                {createdRoom.room_code}
                            </p>
                        </div>
                        <div className="flex justify-center mt-4">
                            <img src={createdRoom.qrCodeUrl} alt="Chat Room QR Code" className="p-2 bg-white rounded-lg" />
                        </div>
                        
                        {/* 🟢 NEW: Action buttons */}
                        <div className="flex flex-col space-y-2 mt-6">
                            <button
                                onClick={() => router.push(`/chat/${createdRoom.room_code}`)}
                                className="w-full py-3 font-semibold text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
                            >
                                Quick Join Chat
                            </button>
                            <button
                                onClick={handleCopyLink}
                                className="w-full py-3 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                            >
                                Copy Room Link
                            </button>
                            <button
                                onClick={handleDownloadQr}
                                className="w-full py-3 font-semibold text-white bg-gray-600 rounded-md hover:bg-gray-700 transition-colors"
                            >
                                Download QR Code
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex border-b border-gray-700">
                            <button
                                onClick={() => { setView('create'); setError(null); }}
                                className={`flex-1 py-2 font-semibold ${view === 'create'
                                    ? 'text-purple-400 border-b-2 border-purple-400'
                                    : 'text-gray-400'
                                    }`}
                            >
                                Create Room
                            </button>
                            <button
                                onClick={() => { setView('join'); setError(null); }}
                                className={`flex-1 py-2 font-semibold ${view === 'join'
                                    ? 'text-purple-400 border-b-2 border-purple-400'
                                    : 'text-gray-400'
                                    }`}
                            >
                                Join Room
                            </button>
                        </div>

                        {view === 'create' ? (
                            <div className="space-y-4">
                                <h1 className="text-3xl font-bold text-center">Temporary Chat</h1>
                                <p className="text-center text-gray-400">Create a secure, temporary chat room.</p>
                                <div>
                                    <label htmlFor="duration" className="block text-sm font-medium">Duration (minutes)</label>
                                    <input
                                        type="number"
                                        id="duration"
                                        value={duration}
                                        onChange={(e) => setDuration(Number(e.target.value))}
                                        className="w-full px-4 py-2 mt-2 text-white bg-gray-700 border border-gray-600 rounded-md"
                                        min="1"
                                    />
                                </div>
                                <button
                                    onClick={handleCreateRoom}
                                    disabled={isLoading}
                                    className="w-full py-3 font-semibold text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-gray-500"
                                >
                                    {isLoading ? 'Creating...' : 'Create Room'}
                                </button>
                                {error && <p className="text-sm text-center text-red-500">{error}</p>}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <h1 className="text-3xl font-bold text-center">Join a Room</h1>
                                <div>
                                    <label htmlFor="joinCode" className="block text-sm font-medium">Enter Room Code</label>
                                    <input
                                        type="text"
                                        id="joinCode"
                                        value={joinCode}
                                        onChange={(e) => setJoinCode(e.target.value)}
                                        className="w-full px-4 py-2 mt-2 text-white bg-gray-700 border border-gray-600 rounded-md uppercase"
                                        placeholder="e.g., W3BC08"
                                    />
                                </div>
                                <button
                                    onClick={handleJoinRoom}
                                    className="w-full py-3 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                >
                                    Join with Code
                                </button>

                                <div className="relative flex items-center py-2">
                                    <div className="flex-grow border-t border-gray-600"></div>
                                    <span className="flex-shrink px-2 text-gray-400">OR</span>
                                    <div className="flex-grow border-t border-gray-600"></div>
                                </div>

                                <div className="w-full p-1 bg-gray-700 rounded-lg">
                                    <QrCodeScannerComponent onScanSuccess={handleScanSuccess} />
                                </div>

                                <p className="text-xs text-center text-gray-400">Point your camera at a QR code</p>
                                {error && <p className="text-sm text-center text-red-500">{error}</p>}
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}