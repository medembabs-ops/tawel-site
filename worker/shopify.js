// Tawel Style — Shopify Admin API helpers.
// Supabase stays the source of truth for products/stock/orders; every function
// here pushes one direction (Supabase → Shopify), never the reverse.

const API_VERSION = '2024-10';

function isShopifyConfigured(env) {
  return Boolean(env.SHOPIFY_STORE_DOMAIN && env.SHOPIFY_ADMIN_TOKEN);
}

async function shopifyFetch(env, path, options = {}) {
  const res = await fetch(`https://${env.SHOPIFY_STORE_DOMAIN}/admin/api/${API_VERSION}${path}`, {
    ...options,
    headers: {
      'X-Shopify-Access-Token': env.SHOPIFY_ADMIN_TOKEN,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.errors ? JSON.stringify(data.errors) : `Shopify API error ${res.status}`);
  }
  return data;
}

// Cached per warm isolate — a store only ever has a handful of locations and
// this rarely changes, so it's not worth a round trip on every stock update.
let cachedLocationId = null;
async function getLocationId(env) {
  if (cachedLocationId) return cachedLocationId;
  const data = await shopifyFetch(env, '/locations.json');
  cachedLocationId = data.locations[0].id;
  return cachedLocationId;
}

// null/undefined stock in Supabase means "untracked, always available" — Shopify
// has no equivalent concept, so untracked products get pushed with a large
// on-hand number rather than showing as sold out in Shopify.
const UNTRACKED_STOCK_FALLBACK = 999;

function resolveStock(product) {
  return product.stock === null || product.stock === undefined ? UNTRACKED_STOCK_FALLBACK : product.stock;
}

async function upsertProduct(env, product) {
  const sizes = product.sizes && product.sizes.length ? product.sizes : ['One size'];
  const stock = resolveStock(product);

  if (product.shopify_product_id) {
    await shopifyFetch(env, `/products/${product.shopify_product_id}.json`, {
      method: 'PUT',
      body: JSON.stringify({
        product: {
          id: product.shopify_product_id,
          title: product.name,
          body_html: product.description || '',
          product_type: product.category || '',
        },
      }),
    });

    // Only pushes stock for sizes already mapped to a Shopify variant. Sizes
    // added after the first sync aren't created here — re-sync after clearing
    // shopify_product_id to force a full re-create if that happens.
    const variantIds = product.shopify_variant_ids || {};
    const locationId = await getLocationId(env);
    for (const size of sizes) {
      if (variantIds[size]) {
        await shopifyFetch(env, '/inventory_levels/set.json', {
          method: 'POST',
          body: JSON.stringify({
            location_id: locationId,
            inventory_item_id: variantIds[size].inventory_item_id,
            available: stock,
          }),
        });
      }
    }
    return { shopify_product_id: product.shopify_product_id, shopify_variant_ids: variantIds };
  }

  const created = await shopifyFetch(env, '/products.json', {
    method: 'POST',
    body: JSON.stringify({
      product: {
        title: product.name,
        body_html: product.description || '',
        product_type: product.category || '',
        images: product.image ? [{ src: product.image }] : [],
        options: [{ name: 'Size', values: sizes }],
        variants: sizes.map((size) => ({
          option1: size,
          price: String(product.price),
          sku: `${product.id}-${size}`,
          inventory_management: 'shopify',
          inventory_quantity: stock,
        })),
      },
    }),
  });

  const shopify_variant_ids = {};
  created.product.variants.forEach((variant, i) => {
    shopify_variant_ids[sizes[i]] = { variant_id: variant.id, inventory_item_id: variant.inventory_item_id };
  });

  return { shopify_product_id: created.product.id, shopify_variant_ids };
}

async function deleteProduct(env, shopifyProductId) {
  if (!shopifyProductId) return;
  await shopifyFetch(env, `/products/${shopifyProductId}.json`, { method: 'DELETE' });
}

function splitName(fullName) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  return { first_name: parts[0] || '', last_name: parts.slice(1).join(' ') || '' };
}

async function createDraftOrder(env, order, lineItems) {
  const { first_name, last_name } = splitName(order.customer_name);
  const address = order.shipping_address || {};

  const draft = await shopifyFetch(env, '/draft_orders.json', {
    method: 'POST',
    body: JSON.stringify({
      draft_order: {
        line_items: lineItems,
        email: order.customer_email,
        note: `Tawel Style order ${order.reference}`,
        tags: 'tawel-site',
        shipping_address: {
          first_name,
          last_name,
          address1: address.address || '',
          city: address.city || '',
          zip: address.postcode || '',
          country: address.country || '',
        },
        currency: order.currency || 'NGN',
      },
    }),
  });

  return draft.draft_order.id;
}

async function completeDraftOrder(env, draftOrderId) {
  const result = await shopifyFetch(env, `/draft_orders/${draftOrderId}/complete.json?payment_pending=false`, {
    method: 'PUT',
  });
  return result.draft_order.order_id;
}

export { isShopifyConfigured, upsertProduct, deleteProduct, createDraftOrder, completeDraftOrder };
