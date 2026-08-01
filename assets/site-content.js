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
  main.className = 'relative min-h-screen md:h-screen overflow-hidden text-ink grid md:grid-cols-2';
  main.style.backgroundColor = '#F5F5F5';

  const brandPanel = document.createElement('div');
  brandPanel.className = 'grain relative flex flex-col items-center justify-center overflow-hidden py-24 md:py-0';

  const star = document.createElement('img');
  star.src = SITE_CONTENT['images.gold_star'] || 'brand_assets/gold-star.png';
  star.alt = '';
  star.className = 'absolute top-6 left-14 md:top-8 md:left-16 z-20 h-20 w-auto';

  const content = document.createElement('div');
  content.className = 'relative z-10 flex flex-col items-center px-6 text-center gap-1';

  const logo = document.createElement('img');
  logo.src = SITE_CONTENT['images.lock_logo'] || 'assets/img/lock/wordmark-maroon.png';
  logo.alt = 'Tawel Style';
  logo.className = 'wordmark-reveal w-[78vw] max-w-[560px] h-auto';

  const tagline = document.createElement('img');
  tagline.src = SITE_CONTENT['images.lock_tagline'] || 'assets/img/lock/tagline-maroon.png';
  tagline.alt = 'To all we ever love';
  tagline.className = 'w-[52vw] max-w-[320px] h-auto';

  content.append(logo, tagline);
  brandPanel.append(star, content);

  const photoPanel = document.createElement('div');
  photoPanel.className = 'relative h-[45vh] md:h-auto overflow-hidden';

  const photo = document.createElement('img');
  photo.src = SITE_CONTENT['images.lock_photo'] || 'assets/img/lock/model.png';
  photo.alt = '';
  photo.className = 'w-full h-full object-cover object-top';

  photoPanel.appendChild(photo);
  main.append(brandPanel, photoPanel);
  document.body.appendChild(main);
}
