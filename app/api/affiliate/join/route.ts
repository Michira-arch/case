import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get their active profile (usually the first one)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, handle')
    .eq('owner_id', user.id)
    .order('created_at')

  const activeProfile = profiles?.[0]
  if (!activeProfile) {
    return NextResponse.json({ error: 'No profile found' }, { status: 400 })
  }

  // Check if they are already an affiliate
  const { data: existing } = await supabase
    .from('affiliates')
    .select('*')
    .eq('profile_id', activeProfile.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ success: true, affiliate: existing })
  }

  // Generate unique code based on their handle
  let code = activeProfile.handle.toLowerCase()

  // Make sure code only contains valid characters check (code ~ '^[a-z0-9._-]{3,30}$')
  code = code.replace(/[^a-z0-9._-]/g, '')

  if (code.length < 3) code = `${code}ref`
  if (code.length > 30) code = code.slice(0, 30)

  let attempts = 0
  let success = false
  let finalCode = code

  while (attempts < 5 && !success) {
    const checkCode = attempts === 0 ? code : `${code}-${Math.floor(Math.random() * 1000)}`
    
    // Check if code is already taken
    const { data: taken } = await supabase
      .from('affiliates')
      .select('profile_id')
      .eq('code', checkCode)
      .maybeSingle()

    if (!taken) {
      finalCode = checkCode
      success = true
    } else {
      attempts++
    }
  }

  if (!success) {
    return NextResponse.json({ error: 'Failed to generate unique affiliate code' }, { status: 500 })
  }

  // Insert affiliate record
  const { data: newAffiliate, error } = await supabase
    .from('affiliates')
    .insert({
      profile_id: activeProfile.id,
      code: finalCode,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, affiliate: newAffiliate })
}
