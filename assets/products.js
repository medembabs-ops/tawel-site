// Tawel Style — product catalog.
const PRODUCTS = [
  {
    id: 'wordmark-tank-black',
    name: 'Wordmark Tank — Black',
    category: 'Tops',
    price: 68,
    sizes: ['S', 'M', 'L', 'XL'],
    image: 'assets/img/products/wordmark-tank-black.png',
    description: 'Heavyweight ribbed cotton tank with the house wordmark embroidered in Bordeaux across the chest. Black.',
  },
  {
    id: 'wordmark-tank-white',
    name: 'Wordmark Tank — White',
    category: 'Tops',
    price: 68,
    sizes: ['S', 'M', 'L', 'XL'],
    image: 'assets/img/products/wordmark-tank-white.png',
    description: 'Heavyweight ribbed cotton tank with the house wordmark embroidered in Bordeaux across the chest. White.',
  },
  {
    id: 'well-beloved-polo-burgundy',
    name: 'Well Beloved Rugby Polo — Burgundy',
    category: 'Polos',
    price: 148,
    sizes: ['S', 'M', 'L', 'XL'],
    image: 'assets/img/products/rugby-polo-burgundy.png',
    description: 'Block-striped rugby polo in Bordeaux and white, with the TS monogram and Well Beloved crest embroidered at the chest.',
  },
  {
    id: 'well-beloved-polo-green',
    name: 'Well Beloved Rugby Polo — Green',
    category: 'Polos',
    price: 148,
    sizes: ['S', 'M', 'L', 'XL'],
    image: 'assets/img/products/rugby-polo-green.png',
    description: 'Block-striped rugby polo in green and white, with the TS monogram and Well Beloved crest embroidered at the chest.',
  },
  {
    id: 'well-beloved-polo-charcoal',
    name: 'Well Beloved Rugby Polo — Charcoal',
    category: 'Polos',
    price: 148,
    sizes: ['S', 'M', 'L', 'XL'],
    image: 'assets/img/products/rugby-polo-charcoal.png',
    description: 'Block-striped rugby polo in charcoal marl and black, with the TS monogram and Well Beloved crest embroidered at the chest.',
  },
  {
    id: 'well-beloved-polo-tan',
    name: 'Well Beloved Rugby Polo — Tan',
    category: 'Polos',
    price: 148,
    sizes: ['S', 'M', 'L', 'XL'],
    image: 'assets/img/products/rugby-polo-tan.png',
    description: 'Block-striped rugby polo in tan and white, with the TS monogram and Well Beloved crest embroidered at the chest.',
  },
];

function getProductById(id) {
  return PRODUCTS.find((p) => p.id === id);
}
