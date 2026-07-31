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
const productsList = document.getElementById('products-list');
const productsStatus = document.getElementById('products-status');
const addProductBtn = document.getElementById('add-product-btn');
const contentForm = document.getElementById('content-form');
const contentStatus = document.getElementById('content-status');
const siteImagesList = document.getElementById('site-images-list');

let products = [];

function showLogin() {
  loginView.classList.remove('hidden');
  adminView.classList.add('hidden');
  logoutBtn.classList.add('hidden');
}

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
  const imageRows = rows.filter((row) => row.key.startsWith('images.'));
  const textRows = rows.filter((row) => !row.key.startsWith('images.'));

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

siteImagesList.addEventListener('change', async (e) => {
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
});

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
  await Promise.all([loadProductsPanel(), loadContentPanel()]);
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
    await Promise.all([loadProductsPanel(), loadContentPanel()]);
  } else {
    showLogin();
  }
})();
