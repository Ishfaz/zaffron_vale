import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, booking_id } = JSON.parse(event.body);

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing payment verification fields.' })
      };
    }

    // Verify HMAC-SHA256 signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('Signature mismatch:', { expected: expectedSignature, received: razorpay_signature });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid payment signature.' })
      };
    }

    // Update booking to paid
    if (booking_id) {
      await supabase.from('bookings').update({
        status: 'paid',
        razorpay_payment_id: razorpay_payment_id,
        razorpay_signature: razorpay_signature,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', booking_id);
    }

    // Insert payment record
    // Get booking amount from the bookings table
    let amount = 0;
    if (booking_id) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('total_amount')
        .eq('id', booking_id)
        .single();
      if (booking) amount = booking.total_amount;
    }

    await supabase.from('payments').insert({
      booking_id: booking_id || null,
      razorpay_payment_id: razorpay_payment_id,
      razorpay_order_id: razorpay_order_id,
      razorpay_signature: razorpay_signature,
      amount: amount,
      status: 'captured'
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, verified: true })
    };
  } catch (err) {
    console.error('Verify payment error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Payment verification failed.' })
    };
  }
}
