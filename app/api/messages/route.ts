import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    // Read the message details from the incoming request
    const { room_id, sender_name, content } = await request.json();

    // Validate the incoming data
    if (!room_id || !content) {
      return NextResponse.json({ error: 'Room ID and message content are required.' }, { status: 400 });
    }

    // Insert the new message into the 'messages' table in our database
    const { data, error } = await supabase
      .from('messages')
      .insert({
        room_id: room_id,
        sender_name: sender_name || 'Anonymous', // Default to 'Anonymous' if no name is provided
        content: content,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to send message.' }, { status: 500 });
    }

    // Send the newly created message back
    return NextResponse.json(data);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}