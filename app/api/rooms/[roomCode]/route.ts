import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// The fix is in the function signature below.
// We explicitly destructure `params` from the second argument.
export async function GET(
  request: Request,
  { params }: { params: { roomCode: string } }
) {
  try {
    const { roomCode } = await params; // This now works correctly

    // 1. Find the room in the database using the roomCode
    const { data: roomData, error: roomError } = await supabase
      .from('chat_rooms')
      .select('id, expires_at')
      .eq('room_code', roomCode.toUpperCase())
      .single();

    if (roomError || !roomData) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // 2. Check if the room has expired
    if (new Date(roomData.expires_at) <= new Date()) {
      return NextResponse.json({ error: 'This room has expired' }, { status: 410 });
    }

    // 3. If the room is valid, fetch all of its messages
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomData.id)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Supabase messages error:', messagesError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // 4. Return the room details and all its messages
    return NextResponse.json({ room: roomData, messages: messagesData });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}