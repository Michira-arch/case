export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ users: [] });
    }

    // Search profiles table
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, full_name, handle')
      .ilike('handle', `%${query}%`)
      .limit(10);

    if (error) {
      throw error;
    }

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('User search error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

