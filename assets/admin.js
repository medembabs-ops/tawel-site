// Tawel Style — admin panel: login, product CRUD, site copy editor.

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function slugify(str) {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const IMAGE_LABELS = {
  'images.wordmark': 'Logo (wordmark)',
  'images.gold_star': 'Gold star mark',
  'images.lifestyle_seated': 'Homepage photo — seated',
  'images.lifestyle_back': 'Homepage photo — back',
  'images.about_photo': 'About page — photo',
  'images.lock_logo': 'Locked page — logo',
  'images.lock_tagline': 'Locked page — tagline',
  'images.lock_photo': 'Locked page — photo',
  'images.debut_1': 'Debut slider — photo 1',
  'images.debut_2': 'Debut slider — photo 2',
  'images.debut_3': 'Debut slider — photo 3',
  'images.debut_4': 'Debut slider — photo 4',
  'lock.eyebrow': 'Locked page — top eyebrow line',
  'lock.subheading': 'Locked page — subheading',
  'lock.cta': 'Locked page — call to action',
};

function humanizeKey(key) {
  if (IMAGE_LABELS[key]) return IMAGE_LABELS[key];
  const [section, field] = key.split('.');
  return `${section[0].toUpperCase()}${section.slice(1)} — ${field.replace(/_/g, ' ')}`;
}

const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');
const logoutBtn = document.getElementById('logout-btn');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const analyticsStats = document.getElementById('analytics-stats');
const ordersChartEl = document.getElementById('orders-chart');
const analyticsStatus = document.getElementById('analytics-status');
const conversionValueEl = document.getElementById('conversion-value');
const conversionBarEl = document.getElementById('conversion-bar');
const signupGrowthTextEl = document.getElementById('signup-growth-text');
const productsList = document.getElementById('products-list');
const productsStatus = document.getElementById('products-status');
const addProductBtn = document.getElementById('add-product-btn');
const contentForm = document.getElementById('content-form');
const contentStatus = document.getElementById('content-status');
const siteImagesList = document.getElementById('site-images-list');
const debutImagesList = document.getElementById('debut-images-list');
const lockStatusText = document.getElementById('lock-status-text');
const lockToggleBtn = document.getElementById('lock-toggle-btn');
const ordersListEl = document.getElementById('orders-list');
const ordersListStatusEl = document.getElementById('orders-list-status');

let products = [];

function showLogin() {
  loginView.classList.remove('hidden');
  adminView.classList.add('hidden');
  logoutBtn.classList.add('hidden');
}

function formatCurrency(n) {
  return '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

// Plain-SVG area chart — no charting library. `data` is [{ label, value }]:
// a gradient-filled line, anchored to a baseline, with the exact value
// available as a native hover tooltip on each point.
function renderAreaChart(container, data) {
  const width = 640;
  const chartHeight = 140;
  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;

  const points = data.map((d, i) => [
    data.length > 1 ? i * stepX : width / 2,
    chartHeight - (d.value / maxValue) * chartHeight,
  ]);

  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${width},${chartHeight} L0,${chartHeight} Z`;

  const dots = points.map(([x, y], i) => `
    <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="#63010F">
      <title>${escapeHtml(data[i].label)}: ${data[i].value}</title>
    </circle>
  `).join('');

  const labels = points.map(([x], i) => `
    <text x="${x.toFixed(1)}" y="${chartHeight + 16}" font-size="9" fill="#1A1315" fill-opacity="0.5" text-anchor="middle" font-family="Montserrat, sans-serif">${escapeHtml(data[i].label)}</text>
  `).join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${chartHeight + 24}" class="w-full h-auto">
      <defs>
        <linearGradient id="analytics-area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#63010F" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#63010F" stop-opacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" y1="${chartHeight}" x2="${width}" y2="${chartHeight}" stroke="#CAAAAA" stroke-width="1" />
      <path d="${areaPath}" fill="url(#analytics-area-fill)" />
      <path d="${linePath}" fill="none" stroke="#63010F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      ${dots}
      ${labels}
    </svg>
  `;
}

// A ▲/▼ + percentage badge — never color alone, always paired with a sign
// and arrow. `higherIsBetter` flips which direction reads as favorable
// (e.g. more orders is good, more pending orders is not).
function trendBadge(current, previous, higherIsBetter = true) {
  if (previous === 0 && current === 0) return '';
  if (previous === 0) {
    return '<span class="label text-[9px] px-1.5 py-0.5 text-gold bg-gold/10 flex-shrink-0">▲ NEW</span>';
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return '';
  const isUp = pct > 0;
  const favorable = isUp === higherIsBetter;
  const color = favorable ? 'text-gold bg-gold/10' : 'text-bordeaux bg-bordeaux/10';
  const arrow = isUp ? '▲' : '▼';
  return `<span class="label text-[9px] px-1.5 py-0.5 ${color} flex-shrink-0">${arrow} ${Math.abs(pct)}%</span>`;
}

function statTileHtml(label, value, badge) {
  return `
    <div class="border border-blush p-4">
      <p class="label text-[10px] text-ink/60 mb-2">${escapeHtml(label)}</p>
      <div class="flex items-baseline justify-between gap-2">
        <p class="font-display text-[24px] leading-none">${value}</p>
        ${badge}
      </div>
    </div>
  `;
}

function lastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

function countByDay(rows, days) {
  const counts = days.map(() => 0);
  rows.forEach((row) => {
    const rowDate = new Date(row.created_at);
    rowDate.setHours(0, 0, 0, 0);
    const idx = days.findIndex((d) => d.getTime() === rowDate.getTime());
    if (idx !== -1) counts[idx] += 1;
  });
  return counts;
}

async function loadAnalytics() {
  const [ordersRes, guestListRes] = await Promise.all([
    supabaseClient.from('orders').select('amount, payment_status, created_at'),
    supabaseClient.from('guest_list').select('email, created_at'),
  ]);

  if (ordersRes.error || guestListRes.error) {
    analyticsStatus.textContent = `Failed to load analytics: ${(ordersRes.error || guestListRes.error).message}`;
    return;
  }

  const orders = ordersRes.data || [];
  const guestList = guestListRes.data || [];

  const paidOrders = orders.filter((o) => o.payment_status === 'paid');
  const pendingOrders = orders.filter((o) => o.payment_status === 'pending');
  const cancelledOrders = orders.filter((o) => o.payment_status === 'cancelled');
  const revenue = paidOrders.reduce((sum, o) => sum + Number(o.amount), 0);

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const inRange = (rows, start, end) => rows.filter((r) => {
    const t = new Date(r.created_at);
    return t >= start && (!end || t < end);
  });

  // "Orders" means paid orders — an order that's still pending or was
  // cancelled never actually became a sale.
  const ordersThisWeek = inRange(paidOrders, weekAgo);
  const ordersLastWeek = inRange(paidOrders, twoWeeksAgo, weekAgo);
  const revenueThisWeek = inRange(paidOrders, weekAgo).reduce((s, o) => s + Number(o.amount), 0);
  const revenueLastWeek = inRange(paidOrders, twoWeeksAgo, weekAgo).reduce((s, o) => s + Number(o.amount), 0);
  const signupsThisWeek = inRange(guestList, weekAgo);
  const signupsLastWeek = inRange(guestList, twoWeeksAgo, weekAgo);
  const pendingThisWeek = inRange(pendingOrders, weekAgo);
  const pendingLastWeek = inRange(pendingOrders, twoWeeksAgo, weekAgo);
  const cancelledThisWeek = inRange(cancelledOrders, weekAgo);
  const cancelledLastWeek = inRange(cancelledOrders, twoWeeksAgo, weekAgo);

  // Payment conversion card.
  const conversionRate = orders.length ? Math.round((paidOrders.length / orders.length) * 100) : 0;
  conversionValueEl.textContent = orders.length ? `${conversionRate}%` : '—';
  conversionBarEl.style.width = `${conversionRate}%`;

  // Guest list insight card.
  if (signupsLastWeek.length === 0 && signupsThisWeek.length === 0) {
    signupGrowthTextEl.textContent = 'No signups yet — share the link once the site unlocks.';
  } else if (signupsLastWeek.length === 0) {
    signupGrowthTextEl.innerHTML = `<span class="text-ink font-semibold">${signupsThisWeek.length}</span> new signups this week.`;
  } else {
    const pct = Math.round(((signupsThisWeek.length - signupsLastWeek.length) / signupsLastWeek.length) * 100);
    const direction = pct >= 0 ? 'up' : 'down';
    signupGrowthTextEl.innerHTML = `<span class="text-ink font-semibold">${signupsThisWeek.length}</span> new signups this week, ${direction} <span class="text-ink font-semibold">${Math.abs(pct)}%</span> vs. last week.`;
  }

  // KPI row, each with a real week-over-week trend badge.
  const tiles = [
    statTileHtml('Orders (paid)', paidOrders.length, trendBadge(ordersThisWeek.length, ordersLastWeek.length, true)),
    statTileHtml('Revenue (paid)', formatCurrency(revenue), trendBadge(revenueThisWeek, revenueLastWeek, true)),
    statTileHtml('Guest list signups', guestList.length, trendBadge(signupsThisWeek.length, signupsLastWeek.length, true)),
    statTileHtml('Pending orders', pendingOrders.length, trendBadge(pendingThisWeek.length, pendingLastWeek.length, false)),
    statTileHtml('Cancelled orders', cancelledOrders.length, trendBadge(cancelledThisWeek.length, cancelledLastWeek.length, false)),
  ];
  analyticsStats.innerHTML = tiles.join('');

  // Main chart: paid orders per day, last 14 days.
  const days = lastNDays(14);
  const orderCounts = countByDay(paidOrders, days);
  const dayLabels = days.map((d) => String(d.getDate()));
  renderAreaChart(ordersChartEl, dayLabels.map((label, i) => ({ label, value: orderCounts[i] })));

  analyticsStatus.textContent = '';
}

const ORDER_STATUS_BADGE = {
  paid: 'text-gold bg-gold/10',
  cancelled: 'text-bordeaux bg-bordeaux/10',
  failed: 'text-bordeaux bg-bordeaux/10',
};

function orderRowHtml(order) {
  const date = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const isPending = order.payment_status === 'pending';
  const action = isPending
    ? `
      <div class="flex gap-2 flex-shrink-0">
        <button type="button" data-action="sent" class="label text-[10px] bg-bordeaux text-ivory px-4 py-2 hover:bg-bordeaux-dark transition-colors">Sent</button>
        <button type="button" data-action="cancel" class="label text-[10px] border border-blush px-4 py-2 hover:border-bordeaux hover:text-bordeaux transition-colors">Cancel</button>
      </div>
    `
    : `<span class="label text-[10px] px-3 py-2 flex-shrink-0 ${ORDER_STATUS_BADGE[order.payment_status] || 'text-ink/60 bg-blush/20'}">${order.payment_status.toUpperCase()}</span>`;

  return `
    <div class="border border-blush p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6" data-order-id="${order.id}">
      <div class="flex-1 min-w-0">
        <p class="text-[13px] truncate">${escapeHtml(order.customer_name)} — <span class="text-ink/60">${escapeHtml(order.customer_email)}</span></p>
        <p class="text-[11px] text-ink/50 mt-1">${escapeHtml(order.reference)} · ${date}</p>
      </div>
      <p class="text-[14px] font-medium flex-shrink-0">${formatCurrency(order.amount)}</p>
      ${action}
    </div>
  `;
}

async function loadOrdersList() {
  const { data, error } = await supabaseClient.from('orders').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) {
    ordersListStatusEl.textContent = `Failed to load orders: ${error.message}`;
    return;
  }
  const orders = data || [];
  ordersListEl.innerHTML = orders.map(orderRowHtml).join('');
  ordersListStatusEl.textContent = orders.length ? '' : 'No orders yet.';
}

ordersListEl.addEventListener('click', async (e) => {
  const action = e.target.getAttribute('data-action');
  if (action !== 'sent' && action !== 'cancel') return;
  const card = e.target.closest('[data-order-id]');
  const id = card.getAttribute('data-order-id');
  const nextStatus = action === 'sent' ? 'paid' : 'cancelled';
  const { error } = await supabaseClient.from('orders').update({ payment_status: nextStatus }).eq('id', id);
  ordersListStatusEl.textContent = error ? `Failed to update: ${error.message}` : 'Updated.';
  if (!error) {
    await loadOrdersList();
    await loadAnalytics();
  }
});

function showAdmin() {
  loginView.classList.add('hidden');
  adminView.classList.remove('hidden');
  logoutBtn.classList.remove('hidden');
}

function productCardHtml(product) {
  const isNew = !product.id;
  return `
    <div class="border border-blush p-5 flex flex-col md:flex-row gap-5" data-product-id="${product.id || ''}" data-is-new="${isNew}">
      <div class="w-full md:w-32 flex-shrink-0">
        <img src="${product.image || 'https://placehold.co/240x300?text=No+image'}" alt="" class="w-full aspect-[4/5] object-cover bg-blush/20 mb-2" data-role="image-preview" />
        <label class="label text-[10px] text-bordeaux underline-grow cursor-pointer">
          Change photo
          <input type="file" accept="image/*" class="hidden" data-field="image-upload" />
        </label>
        <p class="text-[11px] text-ink/50 mt-1" data-role="upload-status"></p>
      </div>
      <div class="flex-1 grid sm:grid-cols-2 gap-3">
        <label class="block text-[12px]">
          <span class="label text-[10px] text-ink/60 block mb-1">Name</span>
          <input type="text" value="${escapeHtml(product.name)}" data-field="name" class="w-full border border-blush focus:border-bordeaux outline-none px-3 py-2 text-[13px] bg-white" />
        </label>
        <label class="block text-[12px]">
          <span class="label text-[10px] text-ink/60 block mb-1">Category</span>
          <input type="text" value="${escapeHtml(product.category)}" data-field="category" class="w-full border border-blush focus:border-bordeaux outline-none px-3 py-2 text-[13px] bg-white" />
        </label>
        <label class="block text-[12px]">
          <span class="label text-[10px] text-ink/60 block mb-1">Price</span>
          <input type="number" step="0.01" value="${product.price ?? ''}" data-field="price" class="w-full border border-blush focus:border-bordeaux outline-none px-3 py-2 text-[13px] bg-white" />
        </label>
        <label class="block text-[12px]">
          <span class="label text-[10px] text-ink/60 block mb-1">Sizes (comma-separated)</span>
          <input type="text" value="${escapeHtml((product.sizes || []).join(', '))}" data-field="sizes" class="w-full border border-blush focus:border-bordeaux outline-none px-3 py-2 text-[13px] bg-white" />
        </label>
        <label class="block text-[12px] sm:col-span-2">
          <span class="label text-[10px] text-ink/60 block mb-1">Description</span>
          <textarea rows="2" data-field="description" class="w-full border border-blush focus:border-bordeaux outline-none px-3 py-2 text-[13px] bg-white">${escapeHtml(product.description || '')}</textarea>
        </label>
      </div>
      <div class="flex md:flex-col gap-2 justify-end">
        <button type="button" data-action="save" class="label text-[10px] bg-bordeaux text-ivory px-4 py-2 hover:bg-bordeaux-dark transition-colors">Save</button>
        <button type="button" data-action="delete" class="label text-[10px] border border-blush px-4 py-2 hover:border-bordeaux hover:text-bordeaux transition-colors">Delete</button>
      </div>
    </div>
  `;
}

function renderProducts() {
  productsList.innerHTML = products.map(productCardHtml).join('');
}

function readCardFields(card) {
  return {
    name: card.querySelector('[data-field="name"]').value.trim(),
    category: card.querySelector('[data-field="category"]').value.trim(),
    price: parseFloat(card.querySelector('[data-field="price"]').value) || 0,
    sizes: card.querySelector('[data-field="sizes"]').value.split(',').map((s) => s.trim()).filter(Boolean),
    description: card.querySelector('[data-field="description"]').value.trim(),
  };
}

async function loadProductsPanel() {
  const { data, error } = await supabaseClient.from('products').select('*').order('created_at', { ascending: true });
  if (error) {
    productsStatus.textContent = `Failed to load products: ${error.message}`;
    return;
  }
  products = data || [];
  renderProducts();
}

function siteImageCardHtml(row) {
  return `
    <div class="border border-blush p-4" data-image-key="${row.key}">
      <img src="${row.value || 'https://placehold.co/400x300?text=No+image'}" alt="" class="w-full aspect-[4/3] object-cover bg-blush/20 mb-3" data-role="image-preview" />
      <p class="label text-[10px] text-ink/60 mb-2">${humanizeKey(row.key)}</p>
      <label class="label text-[10px] text-bordeaux underline-grow cursor-pointer">
        Change photo
        <input type="file" accept="image/*" class="hidden" data-role="image-upload" />
      </label>
      <p class="text-[11px] text-ink/50 mt-1" data-role="upload-status"></p>
    </div>
  `;
}

async function loadContentPanel() {
  const { data, error } = await supabaseClient.from('site_content').select('*').order('key', { ascending: true });
  if (error) {
    contentStatus.textContent = `Failed to load site copy: ${error.message}`;
    return;
  }
  const rows = data || [];
  const debutRows = rows.filter((row) => row.key.startsWith('images.debut_'));
  const imageRows = rows.filter((row) => row.key.startsWith('images.') && !row.key.startsWith('images.debut_'));
  const textRows = rows.filter((row) => !row.key.startsWith('images.') && row.key !== 'site.locked');

  debutImagesList.innerHTML = debutRows.map(siteImageCardHtml).join('');
  siteImagesList.innerHTML = imageRows.map(siteImageCardHtml).join('');

  contentForm.innerHTML = textRows
    .map((row) => {
      const long = row.value.length > 80;
      const field = long
        ? `<textarea rows="4" data-key="${row.key}" class="w-full border border-blush focus:border-bordeaux outline-none px-3 py-2 text-[13px] bg-white">${escapeHtml(row.value)}</textarea>`
        : `<input type="text" value="${escapeHtml(row.value)}" data-key="${row.key}" class="w-full border border-blush focus:border-bordeaux outline-none px-3 py-2 text-[13px] bg-white" />`;
      return `
        <label class="block">
          <span class="label text-[10px] text-ink/60 block mb-2">${humanizeKey(row.key)}</span>
          ${field}
        </label>
      `;
    })
    .join('');
}

async function handleSiteImageUpload(e) {
  if (e.target.getAttribute('data-role') !== 'image-upload') return;
  const card = e.target.closest('[data-image-key]');
  const key = card.getAttribute('data-image-key');
  const file = e.target.files[0];
  if (!file) return;

  const uploadStatus = card.querySelector('[data-role="upload-status"]');
  const preview = card.querySelector('[data-role="image-preview"]');
  uploadStatus.textContent = 'Uploading…';

  const path = `${Date.now()}-${slugify(file.name)}`;
  const { error: uploadError } = await supabaseClient.storage.from('site-images').upload(path, file);
  if (uploadError) {
    uploadStatus.textContent = `Upload failed: ${uploadError.message}`;
    return;
  }

  const { data: publicData } = supabaseClient.storage.from('site-images').getPublicUrl(path);
  const { error: saveError } = await supabaseClient.from('site_content').upsert({ key, value: publicData.publicUrl });
  if (saveError) {
    uploadStatus.textContent = `Save failed: ${saveError.message}`;
    return;
  }
  preview.setAttribute('src', publicData.publicUrl);
  uploadStatus.textContent = 'Updated — live on the site now.';
}

siteImagesList.addEventListener('change', handleSiteImageUpload);
debutImagesList.addEventListener('change', handleSiteImageUpload);

productsList.addEventListener('click', async (e) => {
  const card = e.target.closest('[data-product-id], [data-is-new]');
  if (!card) return;
  const action = e.target.getAttribute('data-action');
  if (!action) return;

  if (action === 'save') {
    const fields = readCardFields(card);
    const isNew = card.getAttribute('data-is-new') === 'true';
    const existingId = card.getAttribute('data-product-id');
    const id = isNew ? slugify(fields.name) : existingId;

    if (!id) {
      productsStatus.textContent = 'Enter a product name before saving.';
      return;
    }

    const imagePreview = card.querySelector('[data-role="image-preview"]').getAttribute('src');
    const image = imagePreview.startsWith('https://placehold.co') ? null : imagePreview;

    const { error } = isNew
      ? await supabaseClient.from('products').insert({ id, ...fields, image })
      : await supabaseClient.from('products').update({ ...fields, image }).eq('id', existingId);

    productsStatus.textContent = error
      ? `Save failed: ${error.message}${isNew ? ' — try a different name, that id may already exist.' : ''}`
      : `Saved "${fields.name}".`;
    if (!error) await loadProductsPanel();
  }

  if (action === 'delete') {
    const existingId = card.getAttribute('data-product-id');
    if (!existingId) {
      card.remove();
      return;
    }
    if (e.target.getAttribute('data-confirm') !== 'true') {
      e.target.textContent = 'Click again to confirm';
      e.target.setAttribute('data-confirm', 'true');
      return;
    }
    const { error } = await supabaseClient.from('products').delete().eq('id', existingId);
    productsStatus.textContent = error ? `Delete failed: ${error.message}` : 'Product deleted.';
    if (!error) await loadProductsPanel();
  }
});

productsList.addEventListener('change', async (e) => {
  if (e.target.getAttribute('data-field') !== 'image-upload') return;
  const card = e.target.closest('[data-product-id], [data-is-new]');
  const file = e.target.files[0];
  if (!file) return;

  const uploadStatus = card.querySelector('[data-role="upload-status"]');
  const preview = card.querySelector('[data-role="image-preview"]');
  uploadStatus.textContent = 'Uploading…';

  const path = `${Date.now()}-${slugify(file.name)}`;
  const { error: uploadError } = await supabaseClient.storage.from('product-images').upload(path, file);
  if (uploadError) {
    uploadStatus.textContent = `Upload failed: ${uploadError.message}`;
    return;
  }

  const { data } = supabaseClient.storage.from('product-images').getPublicUrl(path);
  preview.setAttribute('src', data.publicUrl);
  uploadStatus.textContent = 'Uploaded — click Save to apply.';
});

addProductBtn.addEventListener('click', () => {
  products.unshift({ id: null, name: '', category: '', price: 0, sizes: [], image: '', description: '' });
  renderProducts();
});

contentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const rows = [...contentForm.querySelectorAll('[data-key]')].map((el) => ({
    key: el.getAttribute('data-key'),
    value: el.value,
  }));
  const { error } = await supabaseClient.from('site_content').upsert(rows);
  contentStatus.textContent = error ? `Save failed: ${error.message}` : 'Site copy saved.';
});

async function loadLockStatus() {
  const { data, error } = await supabaseClient.from('site_content').select('value').eq('key', 'site.locked').maybeSingle();
  const locked = !error && data?.value === 'true';
  lockStatusText.textContent = locked
    ? 'The site is locked — visitors only see a landing page.'
    : 'The site is live and visible to everyone.';
  lockToggleBtn.textContent = locked ? 'Unlock site' : 'Lock site';
  lockToggleBtn.dataset.locked = String(locked);
}

lockToggleBtn.addEventListener('click', async () => {
  const next = lockToggleBtn.dataset.locked !== 'true';
  if (next && !confirm('Lock the site? Visitors will only see a landing page until you unlock it.')) return;
  const { error } = await supabaseClient.from('site_content').upsert({ key: 'site.locked', value: String(next) });
  if (error) {
    lockStatusText.textContent = `Failed to update: ${error.message}`;
    return;
  }
  await loadLockStatus();
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    loginError.textContent = error.message;
    loginError.classList.remove('hidden');
    return;
  }
  showAdmin();
  await Promise.all([loadProductsPanel(), loadContentPanel(), loadLockStatus(), loadAnalytics(), loadOrdersList()]);
});

logoutBtn.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  showLogin();
});

(async () => {
  if (!supabaseClient) {
    document.getElementById('login-form').innerHTML =
      '<p class="text-[13px] text-bordeaux">Supabase isn\'t configured yet — add your project URL and anon key to assets/supabase-client.js.</p>';
    return;
  }
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    showAdmin();
    await Promise.all([loadProductsPanel(), loadContentPanel(), loadLockStatus(), loadAnalytics(), loadOrdersList()]);
  } else {
    showLogin();
  }
})();
