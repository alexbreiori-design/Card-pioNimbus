import { NIMBUS_PRICE } from '@/lib/landing/constants';

export const landingNav = [
  { id: 'como-funciona', label: 'Como funciona', icon: 'steps' },
  { id: 'recursos', label: 'Recursos', icon: 'grid' },
  { id: 'preco', label: 'Preço', icon: 'tag' },
  { id: 'faq', label: 'FAQ', icon: 'faq' },
];

export const landingHero = {
  kicker: 'Cardápio digital',
  titleBefore: 'Seu cardápio pronto para ',
  titleHighlight: 'VENDER!',
  lead: 'Bonito, prático e feito para quem vive de delivery, sem complicação.',
  chips: [
    'Ativação em 48h',
    'Suporte humano',
    'Sem taxa por pedido',
    'Frete por distância',
    'Cardápio do dia automático',
  ],
};

export const landingPains = {
  title: 'Você conhece essa rotina?',
  subtitle: 'A correria do delivery cobra seu preço quando a ferramenta não ajuda.',
  bullets: [
    'Pedidos se perdem no WhatsApp',
    'Frete calculado no achismo',
    'Sistemas caros e cheios de módulos',
    'Cardápio que não passa confiança',
  ],
  hook: 'A Nimbus foi feita para resolver isso, com simplicidade e preço justo.',
  floatCards: [
    { icon: 'chat', title: 'Pedido perdido', text: 'Mensagens misturadas no WhatsApp' },
    { icon: 'truck', title: 'Frete errado', text: 'Cliente desiste no checkout' },
    { icon: 'coins', title: 'Módulos extras', text: 'Paga por tudo que não usa' },
    { icon: 'menu', title: 'Cardápio fraco', text: 'Visual que não converte' },
  ],
};

export const landingSteps = {
  title: 'Soluções Nimbus',
  subtitle: 'Do cadastro ao pedido na cozinha em três passos.',
  items: [
    {
      icon: 'config',
      title: 'Configure',
      text: 'Produtos, horário, Pix e entrega em minutos.',
    },
    {
      icon: 'link',
      title: 'Publique',
      text: 'Seu link com a cara da loja, sem app.',
    },
    {
      icon: 'orders',
      title: 'Gerencie',
      text: 'Painel com alerta, status e ticket.',
    },
  ],
};

export const landingFeaturesMain = [
  {
    id: 'cardapio',
    title: 'Cardápio que converte',
    text: 'Visual profissional, organizado e pensado para o cliente fechar o pedido com confiança.',
    bullets: ['Identidade da sua loja', 'Promoções em destaque', 'Fluxo claro até a sacola'],
    image: '/images/landing/features/cardapio-mobile.webp',
    imageAlt: 'Cardápio Nimbus',
    placeholder: 'Print do cardápio',
  },
  {
    id: 'entrega',
    title: 'Entrega com taxa certa',
    text: 'Zonas por distância e frete calculado antes do cliente confirmar.',
    bullets: ['Raio em quilômetros', 'Cálculo por rota', 'Valor no checkout'],
    image: '/images/landing/features/entrega-zonas.webp',
    imageAlt: 'Zonas de entrega',
    placeholder: 'Print das zonas de entrega',
  },
  {
    id: 'marmitas',
    title: 'Cardápio do dia automático',
    text: 'Cadastre um cardápio por dia da semana e a Nimbus troca sozinha para você.',
    bullets: ['Troca por dia da semana', 'Vitrine nos dias vazios', 'Montagem passo a passo'],
    image: '/images/landing/features/marmitas.webp',
    imageAlt: 'Módulo de marmitas',
    placeholder: 'Print do módulo de marmitas',
  },
  {
    id: 'operacao',
    title: 'Operação sem bagunça',
    text: 'Kanban, alertas, cupons e clientes no mesmo painel.',
    bullets: ['Pedido no balcão', 'Ticket térmico', 'CRM integrado'],
    image: '/images/landing/features/painel-pedidos.webp',
    imageAlt: 'Painel de pedidos',
    placeholder: 'Print do painel',
  },
];

export const landingFeaturesAll = [
  'Pixel do Facebook integrado',
  'WhatsApp no fluxo de pedidos',
  'Cupons e promoções',
  'Combos e sugestões no carrinho',
  'Pizzaria com montagem de sabores',
  'Horário e abertura da loja',
  'Pix, dinheiro e cartão na entrega',
  'Múltiplos endereços por cliente',
  'Cardápio adaptado ao segmento',
  'Treinamento em linguagem simples',
  'Suporte 100% humano',
];

export const landingPricing = {
  title: 'Um preço. Tudo incluso.',
  text: 'Sem plano Pro, sem módulo extra. Valor fixo pelo Cardápio Nimbus completo.',
  planName: 'Nimbus Completo',
  price: NIMBUS_PRICE,
  period: '/ mês',
  note: 'Sem fidelidade no contrato. Cancele quando quiser.',
  cardTagline: 'Tudo incluso · sem módulos extras',
  features: [
    'Cardápio público ilimitado',
    'Painel de pedidos em kanban',
    'Produtos, adicionais, promoções e cupons',
    'Taxa de entrega por zona e distância',
    'Pixel do Facebook',
    'WhatsApp no fluxo de pedidos',
    'Impressão de ticket térmico',
    'CRM de clientes',
    'Múltiplos endereços por cliente',
    'Troca automática de cardápio por dia',
    'Suporte 100% humano',
    'Treinamento incluso',
    'Ativação em até 48h',
    'Segmentos adaptados (marmita, pizza e mais)',
  ],
};

export const landingStats = [
  { value: '48h', label: 'para ativar', color: 'violet' },
  { value: '15 min', label: 'para aprender', color: 'pink' },
  { value: '0', label: 'módulos extras', color: 'blue' },
  { value: '100%', label: 'suporte humano', color: 'emerald' },
];

export const landingTestimonials = [
  {
    quote:
      'Em dois dias o link já estava no ar. A cozinha vê o pedido, imprime e segue. Muito mais simples que o sistema anterior.',
    name: 'Rafael M.',
    role: 'Hamburgueria',
    featured: true,
  },
  {
    quote: 'O frete por distância acabou com a discussão no WhatsApp.',
    name: 'Camila S.',
    role: 'Marmitaria',
  },
  {
    quote: 'Um preço só e tudo incluso. Sem surpresa na fatura.',
    name: 'Diego A.',
    role: 'Restaurante',
  },
];

export const landingFaq = [
  {
    q: 'Preciso saber de tecnologia?',
    a: 'Não. O treinamento é em linguagem simples e você domina o essencial em menos de 15 minutos.',
  },
  {
    q: 'Tem fidelidade no contrato?',
    a: 'Não. A mensalidade é sem fidelidade e você cancela quando quiser.',
  },
  {
    q: 'A Nimbus cobra por pedido?',
    a: 'Não. R$ 149,90/mês com tudo incluso, sem taxa em cima de cada venda.',
  },
  {
    q: 'Como o cliente paga?',
    a: 'Pix, dinheiro ou cartão na entrega. Você configura do seu jeito.',
  },
  {
    q: 'Como funciona a taxa de entrega?',
    a: 'Você cadastra zonas por km. A Nimbus calcula e mostra o frete antes da confirmação.',
  },
  {
    q: 'Em quanto tempo fica pronto?',
    a: 'Ativação em até 48 horas com acompanhamento da equipe.',
  },
  {
    q: 'Serve para pizzaria e marmitaria?',
    a: 'Sim. O cardápio se adapta ao segmento da sua loja.',
  },
];

export const landingCta = {
  title: 'Pronto para vender com um cardápio de verdade?',
  text: 'Fale com a Nimbus e coloque sua loja no ar em até 48h.',
};

export const landingFooter = {
  product: [
    { label: 'Como funciona', href: '#como-funciona' },
    { label: 'Recursos', href: '#recursos' },
    { label: 'Preço', href: '#preco' },
    { label: 'Ver exemplo', href: '/nimbus-burger' },
  ],
  company: [
    { label: 'Falar no WhatsApp', href: 'whatsapp' },
    { label: 'Login lojista', href: '/login' },
  ],
  resources: [
    { label: 'FAQ', href: '#faq' },
    { label: 'Cardápio demo', href: '/nimbus-burger' },
  ],
  legal: [
    { label: 'Privacidade', href: '/privacidade?from=%2F' },
    { label: 'Termos', href: '/termos?from=%2F' },
  ],
};
