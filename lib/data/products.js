export const PRODUCTS = [
  {
    id: 1, category: 'Combos com Promoção!',
    name: 'Cremes de 500g + 3 adicionais Grátis',
    desc: '1 ou 2 cremes a sua escolha no mesmo recipiente metade/metade e mais 3 toppings que você mais gosta.',
    price: 42.90, emoji: '🫐',
    addons: [
      { section: 'Escolha o seu creme', required: true, max: 2, items: [
        { id:'a1', name:'Creme de Açaí', desc:'Rico em antioxidantes, fibras e minerais. É low carb.', emoji:'🍇', extra: 0 },
        { id:'a2', name:'Creme de Açaí Fit', desc:'Açaí sem adição de açúcar ou adoçante. Puro!', emoji:'🫐', extra: 0 },
        { id:'a3', name:'Creme de Ninho', desc:'Cremoso e irresistível sabor de leite em pó.', emoji:'🥛', extra: 0 },
      ]},
      { section: 'Escolha os toppings (3)', required: true, max: 3, items: [
        { id:'b1', name:'Granola Mix', desc:'Crocante e nutritiva.', emoji:'🌾', extra: 0 },
        { id:'b2', name:'Leite condensado', desc:'Docinho por cima.', emoji:'🍬', extra: 0 },
        { id:'b3', name:'Morango', desc:'Fruta fresca fatiada.', emoji:'🍓', extra: 0 },
        { id:'b4', name:'Kiwi', desc:'Fruta fresca fatiada.', emoji:'🥝', extra: 0 },
        { id:'b5', name:'Banana', desc:'Fruta fresca fatiada.', emoji:'🍌', extra: 0 },
        { id:'b6', name:'Paçoca', desc:'Paçoca esfarelada por cima.', emoji:'🟤', extra: 0 },
      ]},
    ]
  },
  {
    id: 2, category: 'Combos com Promoção!',
    name: '1kg + 4 adicionais grátis',
    desc: '1kg de açaí + 4 adicionais a sua escolha.',
    price: 61.90, emoji: '🍓',
    addons: [
      { section: 'Escolha o seu creme', required: true, max: 2, items: [
        { id:'a1', name:'Creme de Açaí', desc:'Rico em antioxidantes, fibras e minerais. É low carb.', emoji:'🍇', extra: 0 },
        { id:'a2', name:'Creme de Açaí Fit', desc:'Puro e sem adoçante.', emoji:'🫐', extra: 0 },
      ]},
      { section: 'Escolha 4 toppings', required: true, max: 4, items: [
        { id:'b1', name:'Granola Mix', desc:'Crocante e nutritiva.', emoji:'🌾', extra: 0 },
        { id:'b2', name:'Leite condensado', desc:'Docinho.', emoji:'🍬', extra: 0 },
        { id:'b3', name:'Morango', desc:'Fresco.', emoji:'🍓', extra: 0 },
        { id:'b4', name:'Kiwi', desc:'Fresco.', emoji:'🥝', extra: 0 },
        { id:'b5', name:'Nutella', desc:'+R$ 5,00', emoji:'🍫', extra: 5 },
      ]},
    ]
  },
  {
    id: 3, category: 'Combos com Promoção!',
    name: '700g + 3 adicionais grátis',
    desc: '1 ou 2 cremes a sua escolha no mesmo recipiente metade/metade e mais 3 toppings sem repetição.',
    price: 48.90, emoji: '🥝',
    addons: [
      { section: 'Escolha o seu creme', required: true, max: 1, items: [
        { id:'a1', name:'Creme de Açaí', desc:'Low carb e nutritivo.', emoji:'🍇', extra: 0 },
        { id:'a2', name:'Creme de Ninho', desc:'Cremoso e adocicado.', emoji:'🥛', extra: 0 },
      ]},
    ]
  },
  {
    id: 4, category: 'Combos com Promoção!',
    name: 'Cremes de 300g + 3 adicionais Grátis',
    desc: '1 ou 2 cremes a sua escolha no mesmo recipiente metade/metade e mais 3 toppings do jeitinho que você mais gosta.',
    price: 34.90, emoji: '🍌',
    addons: [
      { section: 'Escolha o seu creme', required: true, max: 2, items: [
        { id:'a1', name:'Creme de Açaí', desc:'Antioxidante e low carb.', emoji:'🍇', extra: 0 },
        { id:'a3', name:'Creme de Ninho', desc:'Para quem ama leite em pó.', emoji:'🥛', extra: 0 },
      ]},
    ]
  },
  {
    id: 5, category: 'Açaí no Copo',
    name: 'Açaí no Copo 300ml',
    desc: 'Açaí cremoso servido no copo com 1 topping à escolha.',
    price: 18.90, emoji: '🧋',
    addons: [
      { section: 'Escolha o topping', required: true, max: 1, items: [
        { id:'t1', name:'Granola', desc:'', emoji:'🌾', extra: 0 },
        { id:'t2', name:'Leite condensado', desc:'', emoji:'🍬', extra: 0 },
        { id:'t3', name:'Morango', desc:'', emoji:'🍓', extra: 0 },
      ]},
    ]
  },
  {
    id: 6, category: 'Açaí no Copo',
    name: 'Açaí no Copo 500ml',
    desc: 'Açaí cremoso no copo grande com 2 toppings à escolha.',
    price: 26.90, emoji: '🥤',
    addons: [
      { section: 'Escolha 2 toppings', required: true, max: 2, items: [
        { id:'t1', name:'Granola', desc:'', emoji:'🌾', extra: 0 },
        { id:'t2', name:'Leite condensado', desc:'', emoji:'🍬', extra: 0 },
        { id:'t3', name:'Morango', desc:'', emoji:'🍓', extra: 0 },
        { id:'t4', name:'Banana', desc:'', emoji:'🍌', extra: 0 },
      ]},
    ]
  },
  {
    id: 7, category: 'Açaí no Pote',
    name: 'Açaí no Pote 500g',
    desc: 'Porção generosa de açaí cremoso em pote com granola e fruta.',
    price: 32.90, emoji: '🍶',
    addons: [
      { section: 'Escolha o creme', required: true, max: 1, items: [
        { id:'a1', name:'Creme de Açaí', desc:'', emoji:'🍇', extra: 0 },
        { id:'a2', name:'Creme Fit', desc:'', emoji:'🫐', extra: 0 },
      ]},
    ]
  },
  {
    id: 8, category: 'Bebidas',
    name: 'Água Mineral sem gás 500ml',
    desc: 'Água gelada.',
    price: 4.00, emoji: '💧',
    addons: []
  },
  {
    id: 9, category: 'Bebidas',
    name: 'Refrigerante Lata 350ml',
    desc: 'Coca-Cola, Guaraná ou Sprite.',
    price: 7.00, emoji: '🥫',
    addons: []
  },
];

export const ALSO_ITEMS = [
  { name: 'Água s/ gás', emoji: '💧', price: 4.00 },
  { name: 'Água c/ gás', emoji: '🫧', price: 5.00 },
  { name: 'Granola extra', emoji: '🌾', price: 3.00 },
];

export const CATEGORIES = [
  "Todos",
  "Combos com Promoção!",
  "Açaí no Copo",
  "Açaí no Pote",
  "Bebidas",
  "Adicionais",
];
