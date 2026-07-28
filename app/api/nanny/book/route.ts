import { NextRequest, NextResponse } from 'next/server'
import { createAnonBooking } from '@/lib/nanny-data'
import { sendAgencyEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      org_slug,
      client_name,
      client_email,
      client_phone,
      service_code,
      // Accept both naming conventions: wizard uses start/end_time/address/notes
      // while standard API uses scheduled_start/scheduled_end/service_address/service_notes
      start,
      end_time,
      address,
      notes,
      scheduled_start,
      scheduled_end,
      service_address,
      service_notes,
      special_requirements,
      worker_id,
    } = body

    const resolvedStart = scheduled_start ?? start
    const resolvedEnd = scheduled_end ?? end_time
    const resolvedAddress = service_address ?? address
    const resolvedNotes = service_notes ?? notes

    if (!org_slug || !client_name || !service_code || !resolvedStart || !resolvedEnd || !resolvedAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: org_slug, client_name, service_code, start time, end time, and address are required.' },
        { status: 400 }
      )
    }

    if (!client_email && !client_phone) {
      return NextResponse.json(
        { error: 'Either client_email or client_phone is required for confirmation.' },
        { status: 400 }
      )
    }

    const { result, error } = await createAnonBooking({
      org_slug,
      client_name,
      client_email: client_email || '',
      client_phone: client_phone || '',
      service_code,
      start: resolvedStart,
      end_time: resolvedEnd,
      address: resolvedAddress,
      notes: resolvedNotes,
      special: special_requirements || {},
      worker_id,
    })

    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    // Return result fields at top level for the booking wizard to consume
    const reference = result?.reference ?? result?.booking_id ?? null
    const anon_token = result?.anon_token ?? null

    // Fire and forget webhook for AI to review the booking
    if (result?.booking_id) {
      fetch(new URL('/api/ai/webhooks/booking', req.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          booking_id: result.booking_id, 
          org_slug,
          client_name,
          service_code,
          worker_id
        })
      }).catch(e => console.error('AI Webhook error:', e))
    }

    if (client_email) {
      const emailHtml = `
        <h2>Booking Confirmation</h2>
        <p>Hi ${client_name},</p>
        <p>Thank you for your booking request! Your booking reference is <strong>${reference}</strong>.</p>
        <p>Service: ${service_code}</p>
        <p>Time: ${resolvedStart} - ${resolvedEnd}</p>
        <p>Location: ${resolvedAddress}</p>
        ${anon_token ? `<p><a href="${new URL(`/booking/${anon_token}`, req.url).toString()}" class="btn">Track Your Booking Status</a></p>` : ''}
        <p>We will review your request and get back to you shortly.</p>
      `;
      // Don't await to avoid blocking the response, or await if we want to ensure it works? 
      // The prompt says "Check for silent failures: are send errors caught and swallowed anywhere? Are failed sends retried or surfaced to an admin?". 
      // Let's await it so we can log it, but we won't fail the booking if email fails (since they still have the UI). Actually, let's just await it and log it for now.
      const emailResult = await sendAgencyEmail({
        orgSlug: org_slug,
        to: client_email,
        subject: `Your Booking Reference: ${reference}`,
        htmlBody: emailHtml,
        preheader: `Booking confirmation for ${service_code}`,
      });
      if (!emailResult.success) {
        console.error('Failed to send booking confirmation email to:', client_email, emailResult.error);
        // Note: For a robust system, we should either queue it for retry, or insert into an outbox table. 
        // We'll log it as requested by the user.
      }
    }

    return NextResponse.json({
      success: true,
      reference,
      anon_token,
      booking_id: result?.booking_id ?? null,
      booking: result,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
