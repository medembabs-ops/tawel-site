// Tawel Style — Worker entry point.
// Handles the two Paystack routes server-side (secret keys can never live in
// browser JS) and falls back to the static site for everything else.

const SUPABASE_URL = 'https://gnbmbvsumegybmuqvbkn.supabase.co';

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleInitialize(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!env.PAYSTACK_SECRET_KEY) {
    return jsonResponse({ error: 'Payments are not connected yet — please check back soon.' }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body.' }, 400);
  }

  const { reference, email, amount } = body;
  if (!reference || !email || !amount) {
    return jsonResponse({ error: 'Missing reference, email, or amount.' }, 400);
  }

  const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reference,
      email,
      amount: Math.round(amount * 100), // Paystack expects the amount in kobo
      currency: 'NGN',
      callback_url: new URL('/order-confirmation.html', request.url).toString(),
    }),
  });

  const data = await paystackRes.json();

  if (!paystackRes.ok || !data.status) {
    return jsonResponse({ error: data.message || 'Could not start payment.' }, 502);
  }

  return jsonResponse({ authorization_url: data.data.authorization_url });
}

async function verifyPaystackSignature(request, secret) {
  const signature = request.headers.get('x-paystack-signature');
  if (!signature) return null;

  const bodyText = await request.text();
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(bodyText));
  const computedHex = [...new Uint8Array(signatureBuffer)].map((b) => b.toString(16).padStart(2, '0')).join('');

  return computedHex === signature ? bodyText : null;
}

async function handleWebhook(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!env.PAYSTACK_SECRET_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('Not configured', { status: 503 });
  }

  const bodyText = await verifyPaystackSignature(request, env.PAYSTACK_SECRET_KEY);
  if (!bodyText) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = JSON.parse(bodyText);

  if (event.event === 'charge.success') {
    const reference = event.data.reference;
    const status = event.data.status === 'success' ? 'paid' : 'failed';

    await fetch(`${SUPABASE_URL}/rest/v1/orders?reference=eq.${encodeURIComponent(reference)}`, {
      method: 'PATCH',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ payment_status: status }),
    });
  }

  return new Response('ok', { status: 200 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/paystack/initialize') {
      return handleInitialize(request, env);
    }

    if (url.pathname === '/api/paystack/webhook') {
      return handleWebhook(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
