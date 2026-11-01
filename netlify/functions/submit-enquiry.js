import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MAX_FIELD = 5000;

/**
 * contact.html posts JSON via fetch. But it is also a real <form> with
 * method="POST" action="/api/submit-enquiry" — so if main.js fails to load, or the
 * visitor has JS disabled, or they hit Enter before the script boots, the browser
 * does a NATIVE form POST with application/x-www-form-urlencoded. JSON.parse then
 * throws and the visitor sees a 500 while we lose the enquiry entirely.
 * Accept both encodings.
 */
function parseBody(event) {
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : (event.body || '');

  const headers = event.headers || {};
  const ctype = (headers['content-type'] || headers['Content-Type'] || '').toLowerCase();
  const looksJson = raw.trim().startsWith('{');

  if (ctype.includes('application/json') || looksJson) {
    return { data: JSON.parse(raw), wasForm: false };
  }

  // urlencoded — repeated keys (the `interests` checkboxes) collapse into an array
  const params = new URLSearchParams(raw);
  const data = {};
  for (const key of new Set(params.keys())) {
    const all = params.getAll(key);
    data[key] = all.length > 1 ? all : all[0];
  }
  if (data.interests && !Array.isArray(data.interests)) {
    data.interests = [data.interests];
  }
  return { data, wasForm: true };
}

function clamp(v) {
  if (typeof v !== 'string') return v;
  const t = v.trim();
  return t.length > MAX_FIELD ? t.slice(0, MAX_FIELD) : t;
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let data, wasForm = false;
  try {
    ({ data, wasForm } = parseBody(event));
  } catch (err) {
    console.error('Unparseable enquiry body:', err);
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Could not read the submitted form.' })
    };
  }

  // A native form POST expects a page back, not JSON. And since that path only
  // happens when JS is unavailable, the confirmation has to be a real page — a
  // script-rendered banner would never run.
  const formRedirect = (ok) => ({
    statusCode: 303,
    headers: { Location: ok ? '/thank-you.html' : '/contact.html?error=1' },
    body: ''
  });

  try {
    // Validate required fields
    if (!data.name || !data.email || !data.message) {
      if (wasForm) return formRedirect(false);
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Name, email, and message are required.' })
      };
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email).trim())) {
      if (wasForm) return formRedirect(false);
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid email address.' })
      };
    }

    // Only keep interests we actually offer, so the column can't be used as a
    // dumping ground for arbitrary data.
    const interests = Array.isArray(data.interests)
      ? data.interests.filter(i => typeof i === 'string').slice(0, 20).map(clamp)
      : [];

    // Insert lead into Supabase
    const { data: lead, error } = await supabase.from('leads').insert({
      name: clamp(data.name),
      email: clamp(String(data.email).toLowerCase()),
      phone: clamp(data.phone) || null,
      dates: clamp(data.dates) || null,
      travellers: clamp(data.travellers) || null,
      budget: clamp(data.budget) || null,
      interests: interests,
      message: clamp(data.message),
      source: 'contact_form',
      status: 'new'
    }).select().single();

    if (error) {
      console.error('Supabase insert error:', error);
      if (wasForm) return formRedirect(false);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to save enquiry.' })
      };
    }

    // Send emails (non-blocking — don't let email failure break the form)
    if (process.env.RESEND_API_KEY) {
      const fromAddr = process.env.EMAIL_FROM || 'Zaffron Vale <noreply@zaffronvale.com>';
      const businessEmail = process.env.BUSINESS_EMAIL || 'zaffronvalleytours@gmail.com';
      const customerName = clamp(data.name);
      const customerEmail = clamp(String(data.email).toLowerCase());

      // 1. Confirmation email to customer
      const customerHtml = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#333">
          <h2 style="color:#103C43">Thank you, ${customerName}!</h2>
          <p>We've received your enquiry and our local travel designer will get back to you within <strong>24 hours</strong> with a personalised, day-by-day plan.</p>
          <p>In the meantime, feel free to explore our <a href="https://zaffronvale.com/packages.html" style="color:#E2912E">curated packages</a> or reply to this email if you'd like to add anything.</p>
          <hr style="border:none;border-top:1px solid #e5e1d8;margin:1.5rem 0">
          <p style="font-size:.85rem;color:#777">Zaffron Vale · Kashmir Travel Experiences<br>zaffronvale.com</p>
        </div>`;

      // 2. Notification email to business
      const bizHtml = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
          <h2 style="color:#103C43">New Lead from Contact Form</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:6px 12px;font-weight:bold;border-bottom:1px solid #eee">Name</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${customerName}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:bold;border-bottom:1px solid #eee">Email</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${customerEmail}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:bold;border-bottom:1px solid #eee">Phone</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${clamp(data.phone) || '—'}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:bold;border-bottom:1px solid #eee">Dates</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${clamp(data.dates) || '—'}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:bold;border-bottom:1px solid #eee">Travellers</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${clamp(data.travellers) || '—'}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:bold;border-bottom:1px solid #eee">Budget</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${clamp(data.budget) || '—'}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:bold;border-bottom:1px solid #eee">Interests</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${interests.length ? interests.join(', ') : '—'}</td></tr>
          </table>
          <div style="margin-top:1rem;padding:1rem;background:#f8f6f1;border-radius:6px">
            <strong>Message:</strong><br><div style="white-space:pre-wrap;margin-top:.5rem">${clamp(data.message)}</div>
          </div>
          <p style="margin-top:1rem"><a href="https://zaffronvale.com/admin.html" style="color:#E2912E">Open Admin Dashboard</a></p>
        </div>`;

      const sendEmail = (to, subject, html) =>
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: fromAddr, to: [to], subject, html })
        }).catch(err => console.error('Email send error:', err));

      // Fire both emails in parallel, don't await — form response shouldn't wait
      Promise.all([
        sendEmail(customerEmail, 'We received your enquiry — Zaffron Vale', customerHtml),
        sendEmail(businessEmail, `New lead: ${customerName}`, bizHtml)
      ]).catch(err => console.error('Email error:', err));
    }

    if (wasForm) return formRedirect(true);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, id: lead.id })
    };
  } catch (err) {
    console.error('Submit enquiry error:', err);
    if (wasForm) return formRedirect(false);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server error.' })
    };
  }
}
