'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getNotifications() {
  const supabase = createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'Unauthorized' }
  }

  // Get the profile id for this user
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (profileError || !profile) {
    return { error: 'Profile not found' }
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return { error: error.message }
  }

  return { notifications: data }
}

export async function markNotificationAsRead(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function markAllNotificationsAsRead() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!profile) return { error: 'Profile not found' }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('profile_id', profile.id)
    .eq('is_read', false)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

// Internal function to create a notification (can be called by other server actions)
export async function createNotification({
  profileId,
  type,
  title,
  content,
  link
}: {
  profileId: string
  type: string
  title: string
  content: string
  link?: string
}) {
  const supabase = createClient()
  const { error } = await supabase
    .from('notifications')
    .insert({
      profile_id: profileId,
      type,
      title,
      content,
      link
    })

  if (error) {
    console.error('Failed to create notification', error)
    return { error: error.message }
  }

  return { success: true }
}
