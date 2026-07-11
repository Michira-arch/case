import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query     = searchParams.get('q') || ''
  const category  = searchParams.get('category') || undefined
  const location  = searchParams.get('location') || undefined
  const limit     = parseInt(searchParams.get('limit') || '20')
  const offset    = parseInt(searchParams.get('offset') || '0')

  const supabase = createClient()
  const { data, error } = await supabase.rpc('search_profiles', {
    p_query: query,
    p_category: category || null,
    p_location: location || null,
    p_limit: Math.min(limit, 50),
    p_offset: offset,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ results: data || [] })
}
