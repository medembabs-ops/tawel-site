// Tawel Style — Worker entry point.
// Handles the Paystack and Shopify routes server-side (secret keys can never
// live in browser JS) and falls back to the static site for everything else.

import { isShopifyConfigured, upsertProduct, deleteProduct, createDraftOrder, completeDraftOrder } from './shopify.js';

const SUPABASE_URL = 'https://gnbmbvsumegybmuqvbkn.supabase.co';

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function supabaseHeaders(env, extra = {}) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    ...extra,
  };
}

async function supabaseSelectOne(env, table, column, value) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}&select=*`, {
    headers: supabaseHeaders(env),
  });
  const rows = await res.json();
  return rows[0] || null;
}

async function supabasePatch(env, table, column, value, fields) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}`, {
    method: 'PATCH',
    headers: supabaseHeaders(env, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify(fields),
  });
}

// Confirms the request carries a live Supabase session for the one owner
// account — reuses the service role key as the apikey header, which GoTrue
// accepts in place of the anon key for verifying a user's access token.
async function verifySupabaseUser(request, env) {
  const auth = request.headers.get('authorization');
  if (!auth || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: auth },
  });
  return res.ok ? res.json() : null;
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

    await supabasePatch(env, 'orders', 'reference', reference, { payment_status: status });

    // Convert the matching Shopify draft order into a real, paid order.
    // Failures here never fail the webhook — Paystack retries on non-2xx,
    // and payment confirmation must not depend on Shopify being reachable.
    if (status === 'paid' && isShopifyConfigured(env)) {
      const order = await supabaseSelectOne(env, 'orders', 'reference', reference);
      if (order?.shopify_draft_order_id) {
        try {
          await completeDraftOrder(env, order.shopify_draft_order_id);
        } catch (err) {
          console.error('Shopify draft order completion failed:', err.message);
        }
      }
    }
  }

  return new Response('ok', { status: 200 });
}

async function handleShopifyCreateOrder(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!isShopifyConfigured(env) || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'Shopify is not connected yet.' }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body.' }, 400);
  }

  const { reference } = body;
  if (!reference) {
    return jsonResponse({ error: 'Missing reference.' }, 400);
  }

  const order = await supabaseSelectOne(env, 'orders', 'reference', reference);
  if (!order) {
    return jsonResponse({ error: 'Order not found.' }, 404);
  }
  if (order.shopify_draft_order_id) {
    return jsonResponse({ ok: true, draft_order_id: order.shopify_draft_order_id });
  }

  const productIds = [...new Set((order.items || []).map((item) => item.id))];
  let products = [];
  if (productIds.length) {
    const filter = productIds.map(encodeURIComponent).join(',');
    const productsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/products?id=in.(${filter})&select=id,shopify_variant_ids`,
      { headers: supabaseHeaders(env) }
    );
    products = await productsRes.json();
  }
  const variantLookup = {};
  products.forEach((p) => {
    variantLookup[p.id] = p.shopify_variant_ids || {};
  });

  const lineItems = (order.items || []).map((item) => {
    const variant = variantLookup[item.id]?.[item.size];
    return variant
      ? { variant_id: variant.variant_id, quantity: item.qty }
      : { title: `${item.name}${item.size ? ` — ${item.size}` : ''}`, price: String(item.price), quantity: item.qty };
  });

  let draftOrderId;
  try {
    draftOrderId = await createDraftOrder(env, order, lineItems);
  } catch (err) {
    return jsonResponse({ error: `Shopify draft order failed: ${err.message}` }, 502);
  }

  await supabasePatch(env, 'orders', 'reference', reference, { shopify_draft_order_id: String(draftOrderId) });

  return jsonResponse({ ok: true, draft_order_id: draftOrderId });
}

async function handleShopifySyncProduct(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!isShopifyConfigured(env) || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'Shopify is not connected yet.' }, 503);
  }

  const user = await verifySupabaseUser(request, env);
  if (!user) {
    return jsonResponse({ error: 'Unauthorized.' }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body.' }, 400);
  }

  const { productId } = body;
  if (!productId) {
    return jsonResponse({ error: 'Missing productId.' }, 400);
  }

  const product = await supabaseSelectOne(env, 'products', 'id', productId);
  if (!product) {
    return jsonResponse({ error: 'Product not found.' }, 404);
  }

  let result;
  try {
    result = await upsertProduct(env, product);
  } catch (err) {
    return jsonResponse({ error: `Shopify sync failed: ${err.message}` }, 502);
  }

  await supabasePatch(env, 'products', 'id', productId, {
    shopify_product_id: String(result.shopify_product_id),
    shopify_variant_ids: result.shopify_variant_ids,
  });

  return jsonResponse({ ok: true });
}

async function handleShopifyDeleteProduct(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!isShopifyConfigured(env)) {
    return jsonResponse({ error: 'Shopify is not connected yet.' }, 503);
  }

  const user = await verifySupabaseUser(request, env);
  if (!user) {
    return jsonResponse({ error: 'Unauthorized.' }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body.' }, 400);
  }

  const { shopifyProductId } = body;
  if (!shopifyProductId) {
    return jsonResponse({ ok: true });
  }

  try {
    await deleteProduct(env, shopifyProductId);
  } catch (err) {
    return jsonResponse({ error: `Shopify delete failed: ${err.message}` }, 502);
  }

  return jsonResponse({ ok: true });
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

    if (url.pathname === '/api/shopify/create-order') {
      return handleShopifyCreateOrder(request, env);
    }

    if (url.pathname === '/api/shopify/sync-product') {
      return handleShopifySyncProduct(request, env);
    }

    if (url.pathname === '/api/shopify/delete-product') {
      return handleShopifyDeleteProduct(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
