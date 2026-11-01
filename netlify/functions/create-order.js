import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';
import { lookupUnitPrice, MAX_GUESTS, MAX_ORDER_AMOUNT } from './catalogue.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const data = JSON.parse(event.body);

    // Validate required fields
    if (!data.item_name || !data.guest_name || !data.guest_email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Item name, guest name, and email are required.' })
      };
    }

    if (!EMAIL_RE.test(data.guest_email)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid email address.' })
      };
    }

    // Missing / 0 / unparseable guests is treated as 1 rather than rejected — the
    // field is optional in the modal. Safe, because the price is computed server-side.
    const rawGuests = parseInt(data.guests, 10);
    const guests = Number.isNaN(rawGuests) || rawGuests === 0 ? 1 : rawGuests;
    if (guests < 1 || guests > MAX_GUESTS) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Guests must be between 1 and ' + MAX_GUESTS + '.' })
      };
    }

    const itemType = data.item_type || 'experience';

    // NEVER trust the amount sent by the browser — anyone can edit data-price in
    // DevTools and pay ₹1 for a ₹3,200 houseboat. Price the order server-side.
    const priced = lookupUnitPrice(itemType, data.item_name);
    if (!priced.ok) {
      console.error('Price lookup failed:', priced.reason);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'This item is not available for online booking.' })
      };
    }

    const amount = priced.unitPrice * guests;

    if (amount < 100 || amount > MAX_ORDER_AMOUNT) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Order total is out of range.' })
      };
    }

    // If the browser sent an amount that disagrees with the catalogue, the page and
    // this file have drifted apart. Refuse rather than silently charge a different
    // price than the customer was shown.
    if (data.amount !== undefined && parseInt(data.amount, 10) !== amount) {
      console.error('Price mismatch', {
        item: data.item_name,
        client_sent: parseInt(data.amount, 10),
        server_price: amount
      });
      return {
        statusCode: 409,
        body: JSON.stringify({
          error: 'The price of this experience has changed. Please refresh the page and try again.'
        })
      };
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amount,
      currency: 'INR',
      receipt: 'zv_' + Date.now(),
      notes: {
        item_name: data.item_name,
        item_type: itemType,
        guests: String(guests),
        guest_name: data.guest_name,
        guest_email: data.guest_email
      }
    });

    // Find or create a lead for this guest
    let leadId = null;
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('email', data.guest_email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();   // .single() errors when the guest is new — the common path

    if (existingLead) {
      leadId = existingLead.id;
    } else {
      const { data: newLead } = await supabase.from('leads').insert({
        name: data.guest_name,
        email: data.guest_email,
        phone: data.guest_phone || null,
        message: 'Direct booking: ' + data.item_name,
        source: 'direct_booking'
      }).select().single();
      if (newLead) leadId = newLead.id;
    }

    // Create pending booking
    const { data: booking, error: bookingError } = await supabase.from('bookings').insert({
      lead_id: leadId,
      item_type: itemType,
      item_name: data.item_name,
      guests: guests,
      travel_dates: data.travel_dates || null,
      total_amount: amount,
      razorpay_order_id: order.id,
      status: 'pending'
    }).select().single();

    if (bookingError) {
      console.error('Booking insert error:', bookingError);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        booking_id: booking ? booking.id : null,
        key_id: process.env.RAZORPAY_KEY_ID
      })
    };
  } catch (err) {
    console.error('Create order error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create order.' })
    };
  }
}
