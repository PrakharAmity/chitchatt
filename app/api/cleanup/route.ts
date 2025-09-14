import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  // 1. Check for the secret key to ensure this is an authorized request
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Find all rooms where the 'expires_at' timestamp is in the past
    const { data: expiredRooms, error: findError } = await supabase
      .from('chat_rooms')
      .select('id')
      .lt('expires_at', new Date().toISOString()); // 'lt' means "less than"

    if (findError) {
      console.error('Error finding expired rooms:', findError);
      return NextResponse.json({ error: 'Failed to find expired rooms' }, { status: 500 });
    }

    if (expiredRooms.length === 0) {
      return NextResponse.json({ message: 'No expired rooms to delete.' });
    }

    const roomIdsToDelete = expiredRooms.map(room => room.id);

    // 3. Delete all the expired rooms in one go
    // Because we used "ON DELETE CASCADE" in our database setup,
    // all messages associated with these rooms will be deleted automatically.
    const { error: deleteError } = await supabase
      .from('chat_rooms')
      .delete()
      .in('id', roomIdsToDelete);

    if (deleteError) {
      console.error('Error deleting expired rooms:', deleteError);
      return NextResponse.json({ error: 'Failed to delete expired rooms' }, { status: 500 });
    }

    return NextResponse.json({ message: `Successfully deleted ${expiredRooms.length} expired rooms.` });

  } catch (error) {
    console.error('Cleanup API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}