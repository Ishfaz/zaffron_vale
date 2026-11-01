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
    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = event.headers['x-razorpay-signature'];

    if (!signature || !webhookSecret) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing signature.' }) };
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(event.body)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('Webhook signature mismatch');
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid webhook signature.' }) };
    }

    const payload = JSON.parse(event.body);
    const eventType = payload.event;
    const paymentEntity = payload.payload && payload.payload.payment && payload.payload.payment.entity;

    if (!paymentEntity) {
      return { statusCode: 200, body: JSON.stringify({ received: true }) };
    }

    const orderId = paymentEntity.order_id;
    const paymentId = paymentEntity.id;
    const amount = paymentEntity.amount;
    const method = paymentEntity.method;

    if (eventType === 'payment.captured') {
      // Find the booking by Razorpay order ID
      const { data: booking } = await supabase
        .from('bookings')
        .select('id')
        .eq('razorpay_order_id', orderId)
        .single();

      if (booking) {
        // Update booking status
        await supabase.from('bookings').update({
          status: 'paid',
          razorpay_payment_id: paymentId,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).eq('id', booking.id);

        // Upsert payment record
        await supabase.from('payments').upsert({
          booking_id: booking.id,
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
          amount: amount,
          method: method || 'unknown',
          status: 'captured',
          webhook_event: eventType,
          webhook_payload: payload
        }, { onConflict: 'razorpay_payment_id' });
      }
    } else if (eventType === 'payment.failed') {
      const { data: booking } = await supabase
        .from('bookings')
        .select('id')
        .eq('razorpay_order_id', orderId)
        .single();

      if (booking) {
        await supabase.from('payments').insert({
          booking_id: booking.id,
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
          amount: amount,
          method: method || 'unknown',
          status: 'failed',
          webhook_event: eventType,
          webhook_payload: payload
        });
      }
    } else if (eventType === 'refund.created') {
      const refundEntity = payload.payload.refund && payload.payload.refund.entity;
      if (refundEntity) {
        const refundPaymentId = refundEntity.payment_id;
        const { data: booking } = await supabase
          .from('bookings')
          .select('id')
          .eq('razorpay_payment_id', refundPaymentId)
          .single();

        if (booking) {
          await supabase.from('bookings').update({
            status: 'refunded',
            updated_at: new Date().toISOString()
          }).eq('id', booking.id);
        }
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ received: true })
    };
  } catch (err) {
    console.error('Webhook error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Webhook processing failed.' })
    };
  }
}
