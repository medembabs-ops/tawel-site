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

// Maroon "fill from pointer" button — a vanilla-JS/CSS recreation of the
// origin-button interaction (radial fill expanding from the hover/press/
// focus point, text flips to light) since this site has no React/motion.
function createFillButton(text) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className =
    'relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full px-8 ' +
    'label text-[11px] border border-bordeaux text-bordeaux cursor-pointer touch-manipulation select-none ' +
    'transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bordeaux/30';

  const fill = document.createElement('span');
  fill.setAttribute('aria-hidden', 'true');
  fill.className = 'pointer-events-none absolute rounded-full bg-bordeaux';
  fill.style.width = '0px';
  fill.style.height = '0px';
  fill.style.left = '50%';
  fill.style.top = '50%';
  fill.style.transform = 'translate(-50%, -50%) scale(0)';
  fill.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';

  const label = document.createElement('span');
  label.className = 'relative z-10';
  label.textContent = text;

  button.append(fill, label);

  function coverDiameter(width, height, x, y) {
    return Math.ceil(2 * Math.max(
      Math.hypot(x, y),
      Math.hypot(width - x, y),
      Math.hypot(x, height - y),
      Math.hypot(width - x, height - y)
    ));
  }

  function activate(x, y) {
    const rect = button.getBoundingClientRect();
    const size = coverDiameter(rect.width, rect.height, x, y);
    fill.style.width = `${size}px`;
    fill.style.height = `${size}px`;
    fill.style.left = `${x}px`;
    fill.style.top = `${y}px`;
    fill.style.transform = 'translate(-50%, -50%) scale(1)';
    button.classList.remove('text-bordeaux');
    button.classList.add('text-ivory');
  }

  function deactivate() {
    fill.style.transform = 'translate(-50%, -50%) scale(0)';
    button.classList.remove('text-ivory');
    button.classList.add('text-bordeaux');
  }

  button.addEventListener('pointerenter', (e) => {
    const rect = button.getBoundingClientRect();
    activate(e.clientX - rect.left, e.clientY - rect.top);
  });
  button.addEventListener('pointerdown', (e) => {
    const rect = button.getBoundingClientRect();
    activate(e.clientX - rect.left, e.clientY - rect.top);
  });
  button.addEventListener('pointerleave', deactivate);
  button.addEventListener('focus', () => {
    const rect = button.getBoundingClientRect();
    activate(rect.width / 2, rect.height / 2);
  });
  button.addEventListener('blur', deactivate);

  return button;
}

// Turns the fill button into an inline email capture: click reveals an
// email field + submit, which inserts into the guest_list table (public
// insert only — see supabase/schema.sql) and swaps to a success message.
function createGuestListCta(label) {
  const wrap = document.createElement('div');
  wrap.className = 'mt-5 flex flex-col items-center gap-2';

  function showButton() {
    wrap.innerHTML = '';
    const button = createFillButton(label);
    button.addEventListener('click', showForm);
    wrap.appendChild(button);
  }

  function showForm() {
    wrap.innerHTML = '';

    const form = document.createElement('form');
    form.className = 'flex items-center gap-2';
    form.noValidate = true;

    const input = document.createElement('input');
    input.type = 'email';
    input.required = true;
    input.placeholder = 'you@email.com';
    input.autocomplete = 'email';
    input.className =
      'h-12 w-56 rounded-full border border-bordeaux/40 bg-white px-5 text-[13px] text-ink ' +
      'outline-none focus:border-bordeaux transition-colors';

    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.setAttribute('aria-label', 'Submit email');
    submit.className =
      'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-bordeaux text-ivory ' +
      'hover:bg-bordeaux-dark transition-colors disabled:opacity-50';
    submit.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>';

    const message = document.createElement('p');
    message.className = 'hidden text-[12px] text-bordeaux';

    form.append(input, submit);
    wrap.append(form, message);
    input.focus();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = input.value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        message.textContent = 'Please enter a valid email address.';
        message.classList.remove('hidden');
        return;
      }

      submit.disabled = true;
      message.classList.add('hidden');

      const { error } = await supabaseClient.from('guest_list').insert({ email });

      if (error) {
        submit.disabled = false;
        message.textContent = error.message.includes('duplicate')
          ? "You're already on the list."
          : 'Something went wrong — please try again.';
        message.classList.remove('hidden');
        return;
      }

      wrap.innerHTML = '';
      const success = document.createElement('p');
      success.className = 'text-[13px] text-bordeaux';
      success.textContent = "You're on the list — we'll be in touch.";
      wrap.appendChild(success);
    });
  }

  showButton();
  return wrap;
}

function renderLockScreen() {
  document.body.innerHTML = '';

  const main = document.createElement('main');
  main.className = 'relative min-h-screen md:h-screen overflow-hidden text-ink flex flex-col';
  main.style.backgroundColor = '#F5F5F5';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'font-display italic text-[13px] md:text-[15px] text-bordeaux text-center px-6 py-5';
  eyebrow.textContent = SITE_CONTENT['lock.eyebrow'] || 'Somethings are worth discovering before they are announced';

  const gridWrap = document.createElement('div');
  gridWrap.className = 'relative flex-1 overflow-hidden grid md:grid-cols-2';

  const brandPanel = document.createElement('div');
  brandPanel.className = 'grain relative flex flex-col items-center justify-center overflow-hidden py-16 md:py-0';

  const content = document.createElement('div');
  content.className = 'relative z-10 flex flex-col items-center px-6 text-center';

  const logo = document.createElement('img');
  logo.src = SITE_CONTENT['images.lock_logo'] || 'assets/img/lock/wordmark-maroon.png';
  logo.alt = 'Tawel Style';
  logo.className = 'wordmark-reveal w-[78vw] max-w-[560px] h-auto';

  const tagline = document.createElement('img');
  tagline.src = SITE_CONTENT['images.lock_tagline'] || 'assets/img/lock/tagline-maroon.png';
  tagline.alt = 'To all we ever love';
  tagline.className = 'w-[42vw] max-w-[256px] h-auto mt-1';

  const subheading = document.createElement('p');
  subheading.className = 'text-[14px] md:text-[15px] text-ink/70 mt-6';
  subheading.textContent = SITE_CONTENT['lock.subheading'] || "Preparing for it's first chapter";

  const cta = createGuestListCta(SITE_CONTENT['lock.cta'] || 'Join the guest list');

  content.append(logo, tagline, subheading, cta);
  brandPanel.append(content);

  const photoPanel = document.createElement('div');
  photoPanel.className = 'relative h-[45vh] md:h-auto overflow-hidden';

  const photo = document.createElement('img');
  photo.src = SITE_CONTENT['images.lock_photo'] || 'assets/img/lock/model.png';
  photo.alt = '';
  photo.className = 'w-full h-full object-cover object-top';

  photoPanel.appendChild(photo);
  gridWrap.append(brandPanel, photoPanel);
  main.append(eyebrow, gridWrap);
  document.body.appendChild(main);
}
