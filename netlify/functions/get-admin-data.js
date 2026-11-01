import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

/**
 * Admin dashboard data, fetched server-side.
 *
 * WHY THIS EXISTS
 * admin.html used to hold SUPABASE_ANON_KEY and ADMIN_PASSWORD as literals and
 * query the database straight from the browser. Anyone could press Ctrl+U on the
 * live page and read both. The "password" protected nothing — it was a client-side
 * string comparison, trivially bypassed by opening DevTools and calling the loader
 * functions directly.
 *
 * Now the browser holds no credentials. It posts a password here; this function
 * checks it against the ADMIN_PASSWORD environment variable and only then queries
 * with the service role key, which never leaves the server.
 */

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Compare two strings without leaking their contents through response time.
 * A plain `a === b` short-circuits at the first differing character, so an
 * attacker can measure timing to recover the password one character at a time.
 * Hashing both sides first gives fixed-length inputs, which keeps
 * timingSafeEqual usable regardless of the candidate's length.
 */
function safeEqual(candidate, secret) {
  if (typeof candidate !== 'string' || typeof secret !== 'string') return false;
  const a = crypto.createHash('sha256').update(candidate).digest();
  const b = crypto.createHash('sha256').update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    // Never let a proxy or the browser cache customer data.
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'X-Robots-Tag': 'noindex, nofollow'
  },
  body: JSON.stringify(body)
});

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    console.error('ADMIN_PASSWORD is not set — refusing to serve admin data.');
    return json(503, { error: 'Admin dashboard is not configured yet.' });
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase env vars missing — refusing to serve admin data.');
    return json(503, { error: 'Database is not configured yet.' });
  }

  let password;
  try {
    ({ password } = JSON.parse(event.body || '{}'));
  } catch {
    return json(400, { error: 'Bad request.' });
  }

  if (!safeEqual(password, expected)) {
    // Slow every failure down a little. Makes online brute-forcing impractical
    // without needing to store attempt counts anywhere.
    await new Promise(r => setTimeout(r, 600));
    return json(401, { error: 'Incorrect password.' });
  }

  try {
    const [leadsRes, bookingsRes, paymentsRes] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('bookings').select('*, leads(name, email)').order('created_at', { ascending: false }).limit(500),
      supabase.from('payments').select('*, bookings(item_name)').order('created_at', { ascending: false }).limit(500)
    ]);

    for (const [name, res] of [['leads', leadsRes], ['bookings', bookingsRes], ['payments', paymentsRes]]) {
      if (res.error) {
        console.error(`Supabase ${name} query failed:`, res.error);
        return json(500, { error: 'Could not load ' + name + '.' });
      }
    }

    const leads = leadsRes.data || [];
    const bookings = bookingsRes.data || [];
    const payments = paymentsRes.data || [];

    // Stats computed here so the browser can't disagree with the server.
    const stats = {
      leads: leads.length,
      newLeads: leads.filter(l => (l.status || 'new') === 'new').length,
      bookings: bookings.length,
      // Paid revenue only, in paise.
      revenue: bookings
        .filter(b => b.status === 'paid')
        .reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0)
    };

    return json(200, { leads, bookings, payments, stats });
  } catch (err) {
    console.error('get-admin-data error:', err);
    return json(500, { error: 'Server error.' });
  }
}
