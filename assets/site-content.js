// Tawel Style — editable marketing copy, loaded from Supabase.
// Elements tagged data-content-key="some.key" get their text swapped in by
// applySiteContent() when a value exists; otherwise the HTML's own copy
// (already sitting inside the element) stands as the default.
let SITE_CONTENT = {};

async function loadSiteContent() {
  if (!supabaseClient) {
    console.warn('Supabase not configured — see assets/supabase-client.js');
    return SITE_CONTENT;
  }
  const { data, error } = await supabaseClient.from('site_content').select('key, value');

  if (error) {
    console.error('Failed to load site content:', error.message);
    return SITE_CONTENT;
  }

  SITE_CONTENT = Object.fromEntries((data || []).map((row) => [row.key, row.value]));
  return SITE_CONTENT;
}

function applySiteContent() {
  document.querySelectorAll('[data-content-key]').forEach((el) => {
    const key = el.getAttribute('data-content-key');
    const value = SITE_CONTENT[key];
    if (!value) return;
    if (el.tagName === 'IMG') {
      el.setAttribute('src', value);
      return;
    }
    el.textContent = value;
    if (el.tagName === 'A' && el.getAttribute('href')?.startsWith('mailto:')) {
      el.setAttribute('href', `mailto:${value}`);
    }
  });
}
