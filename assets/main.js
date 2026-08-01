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

// Fixed home/search/account/cart icon dock, shown top-right on every page.
// Pass { centered: true } on pages with the bordeaux header bar so the
// icons align on the same line as the star asset centered inside it.
function renderIconDock(options = {}) {
  if (document.getElementById('icon-dock')) return;
  // top-10 (2.5rem = 40px) is the vertical midpoint of the 80px (h-20)
  // header bar — a fixed offset, not a viewport-relative top-1/2, since
  // this element is itself position:fixed (percentages there resolve
  // against the viewport, not the bar).
  const vertical = options.centered ? 'top-10 -translate-y-1/2' : 'top-6 md:top-8';
  document.body.insertAdjacentHTML('beforeend', `
    <div id="icon-dock" class="fixed ${vertical} right-6 md:right-8 z-40 flex flex-row gap-1 text-gold">
      <a href="index.html" aria-label="Home" class="flex p-[8.4px] rounded opacity-80 hover:opacity-100 hover:bg-gold/10 focus-visible:opacity-100 focus-visible:bg-gold/10 active:opacity-60 transition-colors">
        <svg class="icon h-[21px] w-[21px]" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
          <path d="M946.5 505L560.1 118.8l-25.9-25.9a31.5 31.5 0 0 0-44.4 0L77.5 505a63.9 63.9 0 0 0-18.8 46c.4 35.2 29.7 63.3 64.9 63.3h42.5V940h691.8V614.3h43.4c17.1 0 33.2-6.7 45.3-18.8a63.6 63.6 0 0 0 18.7-45.3c0-17-6.7-33.1-18.8-45.2zM568 868H456V664h112v204zm217.9-325.7V868H632V640c0-22.1-17.9-40-40-40H432c-22.1 0-40 17.9-40 40v228H238.1V542.3h-96l370-369.7 23.1 23.1L882 542.3h-96.1z"></path>
        </svg>
      </a>

      <div class="relative">
        <button type="button" id="icon-dock-search-toggle" aria-label="Search" aria-expanded="false" aria-controls="icon-dock-search-form" class="flex p-[8.4px] rounded opacity-80 hover:opacity-100 hover:bg-gold/10 focus-visible:opacity-100 focus-visible:bg-gold/10 active:opacity-60 transition-colors">
          <svg class="icon h-[21px] w-[21px]" stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </button>
        <form id="icon-dock-search-form" class="hidden absolute right-0 top-full mt-2 w-56">
          <label for="icon-dock-search-input" class="sr-only">Search products</label>
          <input id="icon-dock-search-input" type="text" name="q" placeholder="Search" autocomplete="off" class="w-full bg-ink/80 border border-gold/40 text-ivory placeholder-blush text-[12px] tracking-wide px-3 py-2 outline-none focus:border-gold transition-colors" />
        </form>
      </div>

      <button type="button" aria-label="Account" class="flex p-[8.4px] rounded opacity-60 hover:opacity-80 hover:bg-gold/10 focus-visible:opacity-80 focus-visible:bg-gold/10 active:opacity-50 transition-colors">
        <svg class="icon h-[21px] w-[21px]" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2.5a5.5 5.5 0 0 1 3.096 10.047 9.005 9.005 0 0 1 5.9 8.181.75.75 0 1 1-1.499.044 7.5 7.5 0 0 0-14.993 0 .75.75 0 0 1-1.5-.045 9.005 9.005 0 0 1 5.9-8.18A5.5 5.5 0 0 1 12 2.5ZM8 8a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z"></path>
        </svg>
      </button>

      <a href="cart.html" aria-label="View cart" class="relative flex p-[8.4px] rounded opacity-80 hover:opacity-100 hover:bg-gold/10 focus-visible:opacity-100 focus-visible:bg-gold/10 active:opacity-60 transition-colors">
        <svg class="icon h-[21px] w-[21px]" stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <span data-cart-count class="hidden absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-[9px] rounded-full bg-gold text-ink">0</span>
      </a>
    </div>
  `);

  const searchToggle = document.getElementById('icon-dock-search-toggle');
  const searchForm = document.getElementById('icon-dock-search-form');
  if (searchToggle && searchForm) {
    searchToggle.addEventListener('click', () => {
      const isHidden = searchForm.classList.toggle('hidden');
      searchToggle.setAttribute('aria-expanded', String(!isHidden));
      if (!isHidden) searchForm.querySelector('#icon-dock-search-input').focus();
    });
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = searchForm.querySelector('#icon-dock-search-input').value.trim();
      location.href = q ? `shop.html?search=${encodeURIComponent(q)}` : 'shop.html';
    });
  }
  updateCartBadge();
}

// Fixed header bar behind the icon dock, matching the footer's bordeaux
// so the page reads as bracketed by the same colour top and bottom.
function renderHeaderDivider() {
  if (document.getElementById('header-divider')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div id="header-divider" class="fixed top-0 inset-x-0 z-30 h-20 bg-bordeaux">
      <img src="brand_assets/gold-star.png" alt="" data-content-key="images.gold_star" class="absolute top-1/2 left-14 md:left-16 -translate-y-1/2 h-20 w-auto" />
    </div>
  `);
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

function renderFooter() {
  const mount = document.getElementById('site-footer');
  if (!mount) return;
  const year = new Date().getFullYear();
  mount.innerHTML = `
    <footer class="bg-bordeaux text-ivory">
      <div class="max-w-7xl mx-auto px-6 md:px-10 py-16 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div class="col-span-2 md:col-span-1">
          <img src="brand_assets/wordmark-bordeaux.png" alt="Tawel Style" data-content-key="images.wordmark" class="h-8 w-auto wordmark-reversed mb-4" />
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

// Auto-advancing but genuinely user-scrollable slider. The track's content
// is duplicated in the DOM (rendered twice by the page) so el.scrollLeft can
// wrap seamlessly at the halfway point — in either direction, whether the
// scroll came from our own auto-advance or from the visitor dragging/
// wheeling/touching it themselves. Speed eases toward data-hover-speed on
// hover; auto-advance pauses for a moment after any user interaction so it
// never fights their scroll.
function initInfiniteSliders() {
  document.querySelectorAll('.infinite-slider').forEach((el) => {
    const track = el.querySelector('.infinite-slider-track');
    if (!track || track.dataset.sliderInit) return;
    track.dataset.sliderInit = 'true';

    let halfWidth = track.scrollWidth / 2;
    window.addEventListener('resize', () => {
      halfWidth = track.scrollWidth / 2;
    });

    el.addEventListener('scroll', () => {
      if (halfWidth <= 0) return;
      if (el.scrollLeft >= halfWidth) {
        el.scrollLeft -= halfWidth;
      } else if (el.scrollLeft < 0) {
        el.scrollLeft += halfWidth;
      }
    });

    let userActive = false;
    let userActiveTimer = null;
    const markUserActive = () => {
      userActive = true;
      clearTimeout(userActiveTimer);
      userActiveTimer = setTimeout(() => { userActive = false; }, 1200);
    };
    el.addEventListener('pointerdown', markUserActive);
    el.addEventListener('wheel', markUserActive, { passive: true });
    el.addEventListener('touchstart', markUserActive, { passive: true });

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const baseSpeed = parseFloat(el.dataset.speed || '40');
    const hoverSpeed = parseFloat(el.dataset.hoverSpeed || '12');
    let target = baseSpeed;
    let current = baseSpeed;
    let last = null;

    el.addEventListener('mouseenter', () => { target = hoverSpeed; });
    el.addEventListener('mouseleave', () => { target = baseSpeed; });

    function frame(now) {
      if (last === null) last = now;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      current += (target - current) * Math.min(1, dt * 3);
      if (!userActive) {
        el.scrollLeft += current * dt;
      }
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
