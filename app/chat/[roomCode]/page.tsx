"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// ... interfaces are unchanged ...
interface Message { id: string; room_id: string; sender_name: string; content: string; created_at: string; }
interface RoomDetails { id: string; expires_at: string; }

export default function ChatRoomPage() {
  const params = useParams();
  const roomCode = params.roomCode as string;

  // --- THIS IS THE NEW CHECKPOINT ---
  console.log("Component Rendered. Value of roomCode:", roomCode);

  const [messages, setMessages] = useState<Message[]>([]);
  const [roomDetails, setRoomDetails] = useState<RoomDetails | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- This is the same useEffect with checkpoints from before ---
  useEffect(() => {
    const fetchRoomAndMessages = async () => {
      console.log("Checkpoint 1: Starting to fetch room data...");
      try {
        const response = await fetch(`/api/rooms/${roomCode}`);
        console.log("Checkpoint 2: Received response from API. Status:", response.status);

        if (!response.ok) {
          console.error("API response was not OK.");
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch room data.');
        }

        console.log("Checkpoint 3: Trying to parse JSON from response...");
        const data = await response.json();
        console.log("Checkpoint 4: JSON parsed successfully. Data:", data);
        
        const { room, messages: initialMessages } = data;
        setRoomDetails(room);
        setMessages(initialMessages);
        console.log("Checkpoint 5: State has been updated.");

      } catch (err) {
        console.error("ERROR caught in catch block:", err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        console.log("Checkpoint 6: Finally block reached. Setting loading to false.");
        setIsLoading(false);
      }
    };

    // This check is now very important
    if (roomCode) {
        fetchRoomAndMessages();
    } else {
        console.log("Skipping fetch because roomCode is not available yet.");
    }
  }, [roomCode]);

  // ... The rest of your file is exactly the same ...
  useEffect(() => {
    if (!roomDetails?.id) return;
    const channel = supabase
      .channel(`room:${roomDetails.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomDetails.id}` },
        (payload) => {
          setMessages((currentMessages) => [...currentMessages, payload.new as Message]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomDetails?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !roomDetails?.id) return;
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: roomDetails.id, content: newMessage }),
    });
    setNewMessage('');
  };
  
  if (isLoading) return <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">Loading room...</div>;
  if (error) return <div className="flex items-center justify-center min-h-screen bg-gray-900 text-red-500">Error: {error}</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <header className="p-4 bg-gray-800 shadow-md">
        <h1 className="text-xl font-bold">Room Code: <span className="text-purple-400">{roomCode ? roomCode.toUpperCase() : ''}</span></h1>
      </header>
      <main className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="p-3 rounded-lg bg-gray-700 w-fit max-w-xs">
              <p className="text-sm font-bold text-purple-300">{msg.sender_name}</p>
              <p className="text-white">{msg.content}</p>
              <p className="text-xs text-right text-gray-400 mt-1">{new Date(msg.created_at).toLocaleTimeString()}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>
      <footer className="p-4 bg-gray-800">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500" />
          <button type="submit" className="px-6 py-2 font-semibold text-white bg-purple-600 rounded-full hover:bg-purple-700 transition-colors">Send</button>
        </form>
      </footer>
    </div>
  );
}