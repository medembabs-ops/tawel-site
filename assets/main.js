// Tawel Style — shared chrome (nav/footer), cart, and placeholder plate icons.
const CART_KEY = 'tawel_cart_v1';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(id, size, qty) {
  const cart = getCart();
  const existing = cart.find((i) => i.id === id && i.size === size);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id, size, qty });
  }
  saveCart(cart);
}

function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
}

function updateQty(index, qty) {
  const cart = getCart();
  if (!cart[index]) return;
  cart[index].qty = Math.max(1, qty);
  saveCart(cart);
}

function cartCount() {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}

function cartLines() {
  return getCart()
    .map((item, index) => {
      const product = typeof getProductById === 'function' ? getProductById(item.id) : null;
      return product ? { ...item, index, product } : null;
    })
    .filter(Boolean);
}

function cartSubtotal() {
  return cartLines().reduce((sum, l) => sum + l.product.price * l.qty, 0);
}

function formatPrice(n) {
  return '$' + n.toLocaleString('en-US');
}

function updateCartBadge() {
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    const count = cartCount();
    el.textContent = count;
    el.classList.toggle('hidden', count === 0);
  });
}

// Simple original line-art marks used as stand-ins until real product
// photography is supplied. Each is a minimal single-path garment glyph.
const PLATE_ICONS = {
  a: '<path d="M60 20c-8 6-16 6-24 0l-10 14 8 8v78h72v-78l8-8-10-14c-8 6-16 6-24 0" stroke-width="1.5"/><path d="M60 34v88" stroke-width="1"/>',
  b: '<path d="M46 22h28l6 16-6 8 8 74H38l8-74-6-8z" stroke-width="1.5"/>',
  c: '<path d="M40 22h40l4 96h-18l-6-58-6 58H36z" stroke-width="1.5"/>',
  d: '<path d="M48 18l-6 10 8 6v10l-10 78h40l-10-78v-10l8-6-6-10z" stroke-width="1.5"/>',
  e: '<path d="M60 18c-9 5-18 5-27 1l-13 16 9 9v78h62v-78l9-9-13-16c-9 4-18 4-27-1" stroke-width="1.5"/><path d="M48 30l24 0" stroke-width="1"/>',
  f: '<path d="M44 20h32l5 14-6 6v80H45V40l-6-6z" stroke-width="1.5"/><path d="M60 40v72" stroke-width="1"/>',
  g: '<rect x="24" y="54" width="72" height="14" rx="2" stroke-width="1.5"/><circle cx="60" cy="61" r="4" stroke-width="1.5"/>',
  h: '<rect x="26" y="42" width="68" height="38" stroke-width="1.5"/><path d="M26 61h68M60 42v38" stroke-width="1"/>',
};

// Renders a real (licensed) photo when a product has one, falling back to
// the line-art placeholder plate otherwise.
function mediaMarkup(product, classes) {
  if (product.image) {
    return `<div class="${classes} media-photo"><img src="${product.image}" alt="${product.name}" loading="lazy" /><span class="photo-credit">${product.credit}</span></div>`;
  }
  return `<div class="${classes} plate" data-plate="${product.plate}"></div>`;
}

function initPlates() {
  document.querySelectorAll('[data-plate]:not([data-plate-rendered])').forEach((el) => {
    const key = el.getAttribute('data-plate');
    const glyph = PLATE_ICONS[key] || PLATE_ICONS.a;
    el.innerHTML = `<svg viewBox="0 0 120 120" class="w-1/3 h-1/3 mx-auto my-auto absolute inset-0" fill="none" stroke="#63010F" stroke-linecap="round" stroke-linejoin="round">${glyph}</svg><span class="plate-tag">Plate pending</span>`;
    el.setAttribute('data-plate-rendered', 'true');
  });
}

function renderHeader(active) {
  const mount = document.getElementById('site-header');
  if (!mount) return;
  const links = [
    ['index.html', 'Home'],
    ['shop.html', 'Shop'],
    ['about.html', 'About'],
    ['contact.html', 'Contact'],
  ];
  const navLinks = links
    .map(([href, label]) => {
      const isActive = active === href;
      return `<a href="${href}" class="label text-[11px] underline-grow ${isActive ? 'text-bordeaux' : 'text-ink'} hover:text-bordeaux transition-colors">${label}</a>`;
    })
    .join('');
  mount.innerHTML = `
    <header class="fixed top-0 inset-x-0 z-40 bg-ivory/90 backdrop-blur-sm border-b border-blush">
      <div class="max-w-7xl mx-auto flex items-center justify-between px-6 md:px-10 h-20">
        <a href="index.html" aria-label="Tawel Style — home">
          <img src="brand_assets/wordmark-bordeaux.png" alt="Tawel Style" class="h-7 w-auto" />
        </a>
        <nav class="hidden md:flex items-center gap-10">${navLinks}</nav>
        <div class="flex items-center gap-5">
          <form id="search-form" class="input-container hidden lg:block">
            <label for="search-input" class="sr-only">Search products</label>
            <input id="search-input" name="q" type="text" placeholder="Search" class="input" autocomplete="off" />
            <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A1315" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="7"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </form>
          <a href="cart.html" class="relative label text-[11px] text-ink hover:text-bordeaux transition-colors" aria-label="View cart">
            Cart
            <span data-cart-count class="hidden ml-1 inline-flex items-center justify-center w-4 h-4 text-[9px] rounded-full bg-bordeaux text-ivory align-top">0</span>
          </a>
          <button id="nav-toggle" class="md:hidden label text-[11px]" aria-expanded="false" aria-controls="mobile-nav">Menu</button>
        </div>
      </div>
      <nav id="mobile-nav" class="md:hidden hidden flex-col px-6 pb-6 gap-4 bg-ivory border-t border-blush">${navLinks}</nav>
    </header>
  `;

  const searchForm = document.getElementById('search-form');
  if (searchForm) {
    const params = new URLSearchParams(location.search);
    const currentSearch = params.get('search');
    if (currentSearch) searchForm.querySelector('#search-input').value = currentSearch;
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = searchForm.querySelector('#search-input').value.trim();
      location.href = q ? `shop.html?search=${encodeURIComponent(q)}` : 'shop.html';
    });
  }

  const toggle = document.getElementById('nav-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  if (toggle && mobileNav) {
    toggle.addEventListener('click', () => {
      const isOpen = !mobileNav.classList.contains('hidden');
      mobileNav.classList.toggle('hidden');
      mobileNav.classList.toggle('flex');
      toggle.setAttribute('aria-expanded', String(!isOpen));
    });
  }
  updateCartBadge();
}

function renderFooter() {
  const mount = document.getElementById('site-footer');
  if (!mount) return;
  const year = new Date().getFullYear();
  mount.innerHTML = `
    <footer class="bg-bordeaux text-ivory">
      <div class="max-w-7xl mx-auto px-6 md:px-10 py-16 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div class="col-span-2 md:col-span-1">
          <img src="brand_assets/wordmark-bordeaux.png" alt="Tawel Style" class="h-8 w-auto wordmark-reversed mb-4" />
          <p class="text-[13px] text-blush leading-relaxed max-w-[22ch]">Bordeaux on ivory. Cut quietly, worn deliberately.</p>
        </div>
        <div>
          <p class="label text-[10px] text-blush mb-4">Shop</p>
          <ul class="space-y-2 text-[13px]">
            <li><a href="shop.html" class="hover:text-white transition-colors">All pieces</a></li>
            <li><a href="shop.html?category=Tops" class="hover:text-white transition-colors">Tops</a></li>
            <li><a href="shop.html?category=Polos" class="hover:text-white transition-colors">Polos</a></li>
          </ul>
        </div>
        <div>
          <p class="label text-[10px] text-blush mb-4">House</p>
          <ul class="space-y-2 text-[13px]">
            <li><a href="about.html" class="hover:text-white transition-colors">About</a></li>
            <li><a href="contact.html" class="hover:text-white transition-colors">Contact</a></li>
          </ul>
        </div>
        <div>
          <p class="label text-[10px] text-blush mb-4">Client Care</p>
          <ul class="space-y-2 text-[13px]">
            <li><a href="cart.html" class="hover:text-white transition-colors">Your cart</a></li>
            <li><a href="contact.html" class="hover:text-white transition-colors">Shipping &amp; returns</a></li>
          </ul>
        </div>
      </div>
      <div class="border-t border-white/15">
        <div class="max-w-7xl mx-auto px-6 md:px-10 py-6 flex flex-col md:flex-row justify-between gap-2 text-[11px] text-blush">
          <p>&copy; ${year} Tawel Style. All rights reserved.</p>
          <p>Bordeaux #63010F &middot; Ivory #F6F2EC</p>
        </div>
      </div>
    </footer>
  `;
}

// Vanilla equivalent of a scroll-linked "tilt card" — a title that rises and
// a framed panel that un-tilts and settles as the section scrolls through
// view. Driven by rAF + getBoundingClientRect instead of a motion library,
// to keep the site dependency-free.
function initScrollCard() {
  const sections = document.querySelectorAll('.scroll-card-section');
  if (!sections.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let ticking = false;
  function update() {
    const vh = window.innerHeight;
    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (vh - rect.top) / (rect.height + vh)));
      section.style.setProperty('--progress', progress.toFixed(4));
    });
    ticking = false;
  }
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}

// Vanilla equivalent of an infinite auto-scrolling slider — expects the
// track's content already duplicated in the DOM (rendered twice by the
// page) so the loop can wrap seamlessly at the halfway point. Speed eases
// toward data-hover-speed on hover instead of snapping.
function initInfiniteSliders() {
  document.querySelectorAll('.infinite-slider').forEach((el) => {
    const track = el.querySelector('.infinite-slider-track');
    if (!track || track.dataset.sliderInit) return;
    track.dataset.sliderInit = 'true';

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const baseSpeed = parseFloat(el.dataset.speed || '40');
    const hoverSpeed = parseFloat(el.dataset.hoverSpeed || '12');
    let target = baseSpeed;
    let current = baseSpeed;
    let x = 0;
    let halfWidth = track.scrollWidth / 2;
    let last = null;

    window.addEventListener('resize', () => {
      halfWidth = track.scrollWidth / 2;
    });
    el.addEventListener('mouseenter', () => { target = hoverSpeed; });
    el.addEventListener('mouseleave', () => { target = baseSpeed; });

    function frame(now) {
      if (last === null) last = now;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      current += (target - current) * Math.min(1, dt * 3);
      x -= current * dt;
      if (halfWidth > 0 && Math.abs(x) >= halfWidth) x += halfWidth;
      track.style.transform = `translateX(${x}px)`;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initPlates();
  updateCartBadge();
  initScrollCard();
});
