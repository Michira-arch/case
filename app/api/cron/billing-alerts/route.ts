import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'

export async function GET(request: Request) {
  // Add authentication or cron secret verification here
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Alert for the last 3 days before a bill is due
    // This looks for subscriptions where next_billing_date is between now and 3 days from now
    const { data: subscriptions, error } = await supabase
      .from('nanny_subscriptions')
      .select('id, billing_email, next_billing_date, plan, status, org_id, client_id')
      .eq('status', 'active')
      .gte('next_billing_date', new Date().toISOString())
      .lte('next_billing_date', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString())

    if (error) {
      console.error('Error fetching subscriptions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const emailPromises = subscriptions.map(async (sub) => {
      if (!sub.billing_email) return

      const html = `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Your upcoming bill</h2>
          <p>This is a reminder that your billing for the plan <b>${sub.plan}</b> is due on <b>${new Date(sub.next_billing_date).toLocaleDateString()}</b>.</p>
          <p>Please ensure your payment method is up to date.</p>
          <br/>
          <p>Thanks,<br/>The Team</p>
        </div>
      `

      const emailResult = await sendEmail({
        to: sub.billing_email,
        subject: 'Upcoming Bill Reminder',
        html,
      })

      if (!emailResult.success) {
        console.error('Failed to send billing alert email to:', sub.billing_email, emailResult.error);
      }
    })

    await Promise.all(emailPromises)

    return NextResponse.json({ success: true, count: emailPromises.length })
  } catch (error: any) {
    console.error('Cron job error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
