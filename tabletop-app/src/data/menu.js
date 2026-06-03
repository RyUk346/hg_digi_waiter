/**
 * Mock menu items. Replace with API call (e.g. GET /menu) once backend is up.
 *
 * Schema:
 *   id          string
 *   name        string
 *   categoryId  string  (matches categories.js)
 *   description string
 *   price       number  (in dollars)
 *   image       string  (emoji used as placeholder — replace with URI later)
 *   tint        string  (Tailwind color key)
 *   tags        string[]
 *   inStock     boolean
 *   kcal        number
 *   station     'kitchen' | 'bar' | 'icecream' | 'pastry'
 *   variants    [{ id, name, blurb, priceDelta }]
 *   extras      [{ id, name, priceDelta, inStock }]
 *   removable   [{ id, name }]
 */

export const menu = [
  {
    id: 'glow-smash',
    name: 'Glow Smash Burger',
    categoryId: 'burgers',
    description: 'Beef · Cheddar · Glow Sauce · Brioche bun · House pickles',
    longDescription:
      'Two smashed beef patties, melted aged cheddar, our signature Glow sauce, crisp lettuce, tomato, and house-made pickles on a toasted brioche bun. Served with a side of golden fries.',
    price: 12.5,
    image: '🍔',
    tint: 'brand-light',
    tags: ['signature', 'beef'],
    badge: '⭐ SIGNATURE',
    inStock: true,
    kcal: 425,
    station: 'kitchen',
    variants: [
      { id: 'regular', name: 'Regular', blurb: 'Single patty · 425 kcal', priceDelta: 0 },
      { id: 'large',   name: 'Large',   blurb: 'Double patty · 680 kcal', priceDelta: 3.5 },
    ],
    extras: [
      { id: 'cheese', name: 'Extra cheese',   priceDelta: 1.5, inStock: true },
      { id: 'bacon',  name: 'Crispy bacon',   priceDelta: 2.0, inStock: true },
      { id: 'egg',    name: 'Fried egg',      priceDelta: 1.0, inStock: true },
      { id: 'avo',    name: 'Avocado slices', priceDelta: 1.5, inStock: true },
    ],
    removable: [
      { id: 'onion',   name: 'Onion' },
      { id: 'pickle',  name: 'Pickle' },
      { id: 'mayo',    name: 'Mayo' },
      { id: 'lettuce', name: 'Lettuce' },
    ],
    spice: [
      { id: 'mild',   name: 'Mild' },
      { id: 'medium', name: 'Medium', emoji: '🌶' },
      { id: 'hot',    name: 'Hot',    emoji: '🌶🌶' },
    ],
  },
  {
    id: 'texmex-chicken',
    name: 'Tex-Mex Chicken Burger',
    categoryId: 'burgers',
    description: 'Grilled chicken · Jalapeño · Lime mayo',
    longDescription: 'Grilled marinated chicken with jalapeño, lime mayo, smoked paprika.',
    price: 11.0,
    image: '🍔',
    tint: 'pizza',
    tags: ['chicken', 'spicy'],
    badge: '🌶 SPICY',
    inStock: true,
    kcal: 510,
    station: 'kitchen',
    variants: [{ id: 'regular', name: 'Regular', blurb: 'Single patty', priceDelta: 0 }],
    extras: [
      { id: 'cheese', name: 'Pepper jack', priceDelta: 1.5, inStock: true },
      { id: 'avo',    name: 'Avocado',     priceDelta: 1.5, inStock: true },
    ],
    removable: [{ id: 'jalapeno', name: 'Jalapeño' }, { id: 'onion', name: 'Onion' }],
    spice: [
      { id: 'medium', name: 'Medium', emoji: '🌶' },
      { id: 'hot',    name: 'Hot',    emoji: '🌶🌶' },
    ],
  },
  {
    id: 'beyond-plant',
    name: 'Beyond Plant Burger',
    categoryId: 'burgers',
    description: 'Plant patty · Vegan cheese · Avocado',
    longDescription: '100% plant-based — Beyond patty, vegan cheddar, avocado, on a multi-grain bun.',
    price: 13.0,
    image: '🍔',
    tint: 'icecream',
    tags: ['veggie', 'vegan'],
    badge: '🌱 VEGAN',
    inStock: true,
    kcal: 380,
    station: 'kitchen',
    variants: [{ id: 'regular', name: 'Regular', blurb: 'Single patty', priceDelta: 0 }],
    extras: [
      { id: 'extra-avo', name: 'Extra avocado', priceDelta: 1.5, inStock: true },
    ],
    removable: [{ id: 'onion', name: 'Onion' }],
    spice: [],
  },
  {
    id: 'double-beef',
    name: 'Double Beef Stack',
    categoryId: 'burgers',
    description: 'Two patties · Bacon · BBQ sauce',
    longDescription: 'Two beef patties, crispy bacon, smoked gouda, BBQ sauce, caramelized onion.',
    price: 15.5,
    image: '🍔',
    tint: 'brand-light',
    tags: ['beef'],
    inStock: true,
    kcal: 680,
    station: 'kitchen',
    variants: [{ id: 'regular', name: 'Regular', blurb: 'Double patty · 680 kcal', priceDelta: 0 }],
    extras: [{ id: 'egg', name: 'Fried egg', priceDelta: 1.0, inStock: true }],
    removable: [{ id: 'onion', name: 'Onion' }],
    spice: [],
  },
  {
    id: 'iced-honey-latte',
    name: 'Iced Honey Latte',
    categoryId: 'coffee',
    description: 'Cold brew · Local honey · Oat',
    longDescription: '24h cold-brewed espresso, local honey, choice of oat or whole milk over ice.',
    price: 5.8,
    image: '☕',
    tint: 'tint-icecream',
    tags: ['popular'],
    badge: '🔥 POPULAR',
    inStock: true,
    kcal: 95,
    station: 'bar',
    variants: [
      { id: 'regular', name: 'Regular', blurb: '12 oz', priceDelta: 0 },
      { id: 'large',   name: 'Large',   blurb: '16 oz', priceDelta: 1.0 },
    ],
    extras: [
      { id: 'oat',         name: 'Oat milk',     priceDelta: 0.5, inStock: true },
      { id: 'extra-honey', name: 'Extra honey',  priceDelta: 0.5, inStock: true },
    ],
    removable: [{ id: 'ice', name: 'Ice' }],
    spice: [],
  },
  {
    id: 'margherita-12',
    name: 'Margherita Pizza 12"',
    categoryId: 'pizza',
    description: 'San Marzano · Buffalo mozzarella · Basil',
    longDescription: 'Hand-stretched, San Marzano tomato, buffalo mozzarella, fresh basil.',
    price: 14.5,
    image: '🍕',
    tint: 'pizza',
    tags: [],
    inStock: true,
    kcal: 620,
    station: 'kitchen',
    variants: [
      { id: '12in', name: '12"', blurb: 'Serves 1–2', priceDelta: 0 },
      { id: '18in', name: '18"', blurb: 'Serves 3–4', priceDelta: 7.5 },
    ],
    extras: [{ id: 'extra-cheese', name: 'Extra mozzarella', priceDelta: 2.0, inStock: true }],
    removable: [{ id: 'olives', name: 'Olives' }],
    spice: [],
  },
  {
    id: 'vanilla-scoop',
    name: 'Vanilla Bean Scoop',
    categoryId: 'icecream',
    description: 'House-made · Madagascar vanilla',
    longDescription: 'House-made with Madagascar vanilla bean.',
    price: 3.6,
    image: '🍨',
    tint: 'icecream',
    tags: [],
    inStock: true,
    kcal: 220,
    station: 'icecream',
    variants: [
      { id: '1', name: '1 scoop',  blurb: '', priceDelta: 0 },
      { id: '2', name: '2 scoops', blurb: '', priceDelta: 2.0 },
    ],
    extras: [
      { id: 'cone',    name: 'Waffle cone', priceDelta: 0.5, inStock: true },
      { id: 'fudge',   name: 'Hot fudge',   priceDelta: 1.0, inStock: true },
    ],
    removable: [],
    spice: [],
  },
];

// Helpers
export const menuByCategory = (categoryId) =>
  menu.filter((m) => m.categoryId === categoryId);

export const findItem = (id) => menu.find((m) => m.id === id);

// Featured = "signature" or "popular" tagged items (max 2 for the hero row)
export const featured = menu.filter((m) =>
  (m.tags || []).some((t) => ['signature', 'popular'].includes(t)),
);
