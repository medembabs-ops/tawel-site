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

// Public pages call this first, before rendering anything else — if it
// returns true they should call renderLockScreen() and skip their normal
// render path. admin.html never calls this, so the owner can always get in
// to flip the lock back off.
async function isSiteLocked() {
  await loadSiteContent();
  return SITE_CONTENT['site.locked'] === 'true';
}

function renderLockScreen() {
  document.body.innerHTML = '';
  const main = document.createElement('main');
  main.className = 'min-h-screen flex flex-col items-center justify-center text-center px-6 bg-ink text-ivory';

  const logo = document.createElement('img');
  logo.src = SITE_CONTENT['images.wordmark'] || 'brand_assets/wordmark-bordeaux.png';
  logo.alt = 'Tawel Style';
  logo.className = 'wordmark-reversed w-[60vw] max-w-[320px] h-auto mb-10';

  const heading = document.createElement('h1');
  heading.className = 'font-display text-[26px] md:text-[32px] mb-4';
  heading.textContent = SITE_CONTENT['lock.heading'] || "We'll be right back";

  const message = document.createElement('p');
  message.className = 'text-[15px] text-blush max-w-[46ch] leading-[1.8]';
  message.textContent = SITE_CONTENT['lock.message'] || 'Tawel Style is temporarily unavailable. Please check back soon.';

  main.append(logo, heading, message);
  document.body.appendChild(main);
}
