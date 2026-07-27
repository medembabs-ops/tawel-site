// Tawel Style — product catalog, loaded from Supabase.
let PRODUCTS = [];

async function loadProducts() {
  if (!supabaseClient) {
    console.warn('Supabase not configured — see assets/supabase-client.js');
    return PRODUCTS;
  }
  const { data, error } = await supabaseClient
    .from('products')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to load products:', error.message);
    return PRODUCTS;
  }

  PRODUCTS = data || [];
  return PRODUCTS;
}

function getProductById(id) {
  return PRODUCTS.find((p) => p.id === id);
}
