import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; // Our reusable Supabase client
import QRCode from 'qrcode';

// A simple function to generate a random 6-character room code
const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export async function POST(request: Request) {
  try {
    // 1. Read the duration from the incoming request
    const { duration_minutes } = await request.json();

    if (!duration_minutes || duration_minutes < 1) {
      return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
    }

    // 2. Generate the room details
    const roomCode = generateRoomCode();
    const expiresAt = new Date(Date.now() + duration_minutes * 60 * 1000);

    // 3. Generate a QR code for the room's join link
    // In production, you would replace 'http://localhost:3000' with your website's actual URL
    const joinUrl = `http://localhost:3000/chat/${roomCode}`;
    const qrCodeUrl = await QRCode.toDataURL(joinUrl);

    // 4. Save the new room to our Supabase database
    const { data, error } = await supabase
      .from('chat_rooms')
      .insert({
        room_code: roomCode,
        expires_at: expiresAt.toISOString(),
        duration_minutes: duration_minutes,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
    }

    // 5. Send the new room data and QR code back to the user
    return NextResponse.json({ ...data, qrCodeUrl });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}