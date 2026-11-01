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
