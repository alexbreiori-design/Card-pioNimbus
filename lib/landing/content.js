import { NIMBUS_DEMO_SLUG, NIMBUS_PRICE } from '@/lib/landing/constants';

export const landingNav = [
  { id: 'proposito', label: 'Propósito', icon: 'steps' },
  { id: 'recursos', label: 'Recursos', icon: 'grid' },
  { id: 'preco', label: 'Preço', icon: 'tag' },
  { id: 'faq', label: 'FAQ', icon: 'faq' },
];

export const landingHero = {
  kicker: 'Cardápio digital',
  titleBefore: 'O cardápio mais',
  titleAfter: 'para o seu restaurante.',
  titleWords: ['bonito', 'prático', 'honesto'],
  lead: 'Um cardápio bonito para o seu cliente, prático para a equipe e honesto para o seu bolso.',
  hint: 'Clique no aparelho para experimentar',
  calloutTitle: 'Comprove a melhor\nexperiência de compra!',
  calloutSub: 'Clique em um dos dispositivos e teste.',
  demoClose: 'Fechar demonstração',
  chips: [
    'Ativação em 48h',
    'Suporte humano',
    'Sem taxa por pedido',
    'Frete por distância',
    'Cardápio do dia automático',
  ],
};

export const landingPains = {
  eyebrow: 'A verdade é que...',
  titleLine1: 'Se você chegou até aqui,',
  titleLine2Before: 'é porque ',
  titleHighlight: 'já sabe',
  titleLine2After: ' que precisa',
  titleLine3: 'de um cardápio digital.',
  body: 'Talvez você já tenha testado outras opções. Talvez já tenha se\nfrustrado com sistemas complicados, taxas altas ou que prometem muito e entregam pouco.',
  emphasis: 'A boa notícia? Você acabou de encontrar diferente.',
  mascotSrc: '/images/landing/mascote-page.webp',
  mascotAlt: 'Mascote Nimbus',
  bubbles: [
    {
      icon: 'clock',
      tone: 'purple',
      text: 'Perco muito tempo respondendo pedidos no WhatsApp.',
    },
    {
      icon: 'calculator',
      tone: 'pink',
      text: 'Os sistemas são caros e nenhum pouco práticos.',
    },
    {
      icon: 'user',
      tone: 'blue',
      text: 'Meus clientes reclamam que é difícil fazer o pedido.',
    },
    {
      icon: 'trendUp',
      tone: 'green',
      text: 'Eu só quero é vender mais e ter menos dor de cabeça.',
    },
  ],
  reality: {
    eyebrow: 'A realidade do delivery hoje',
    title: 'Você lida com muitos desafios todos os dias',
    lead: 'E a maioria dos cardápios digitais só adiciona mais um problema.',
    challenges: [
      {
        icon: 'headphones',
        tone: 'pink',
        title: 'Pedidos espalhados',
        text: 'WhatsApp, Instagram, telefone, iFood... tudo misturado e difícil de organizar.',
      },
      {
        icon: 'clock',
        tone: 'blue',
        title: 'Tempo perdido',
        text: 'Você ou sua equipe gastam horas do dia respondendo as mesmas perguntas.',
      },
      {
        icon: 'currency',
        tone: 'purple',
        title: 'Pagando caro',
        text: 'Taxas altas, planos cheios de coisas que você não usa e ainda limitações chatas.',
      },
      {
        icon: 'frown',
        tone: 'orange',
        title: 'Experiência ruim',
        text: 'Cardápios feios, lentos e difíceis de usar afastam seus clientes.',
      },
      {
        icon: 'trendUp',
        tone: 'green',
        title: 'Poderia sair mais venda',
        text: 'Um cardápio mal feito pode te fazer perder pedidos todos os dias, sem você perceber.',
      },
    ],
    bannerBold: 'Não deveria ser assim.',
    bannerRest: ' Seu restaurante merece mais. Seus clientes também.',
  },
};

export const landingPurpose = {
  eyebrow: 'O nosso propósito',
  titleBefore: 'Uma nova visão para o',
  titleHighlight: 'cardápio digital',
  lead: 'Criado por quem também se cansou dos mesmos sistemas de sempre.',
  cards: [
    {
      id: 'bonito',
      icon: 'star',
      title: 'Bonito',
      description: 'Porque o cardápio é a primeira impressão do seu restaurante.',
      image: '/images/landing/features/purpose-bonito.png',
      imageAlt: 'Cardápio Nimbus no celular',
    },
    {
      id: 'pratico',
      icon: 'check',
      title: 'Prático',
      descriptionBefore: 'Porque ninguém deveria ',
      descriptionBold: 'perder tempo',
      descriptionAfter: ' aprendendo a usar um sistema.',
      image: '/images/landing/features/purpose-pratico.png',
      imageAlt: 'Painel Nimbus no tablet',
    },
    {
      id: 'honesto',
      icon: 'shield',
      title: 'Honesto',
      descriptionBefore: 'Porque você merece pagar por um ',
      descriptionBold: 'produto que resolve seu problema',
      descriptionAfter: ', não por centenas de funções que nunca vai usar.',
      bullets: [
        'Tudo que sua operação precisa',
        'Com preço justo',
        'Sem recursos desnecessários',
        'Suporte que realmente ajuda',
      ],
      piggyImage: '/images/landing/features/purpose-honesto-piggy.png',
      piggyAlt: 'Cofrinho ilustrando preço justo',
      mascotImage: '/images/landing/features/mascote-nuvem.png',
      mascotAlt: 'Mascote Nimbus',
    },
  ],
  bannerLine1Before: 'Mais do que um cardápio digital, o Nimbus é feito para o ',
  bannerLine1Bold: 'dia a dia do seu restaurante.',
  bannerLine2Parts: [
    'Bonito para o seu cliente',
    'Prático para a sua equipe',
    'Honesto para o seu bolso.',
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
    { label: 'Propósito', href: '#proposito' },
    { label: 'Recursos', href: '#recursos' },
    { label: 'Preço', href: '#preco' },
    { label: 'Ver exemplo', href: `/${NIMBUS_DEMO_SLUG}` },
  ],
  company: [
    { label: 'Falar no WhatsApp', href: 'whatsapp' },
    { label: 'Login lojista', href: '/login' },
  ],
  resources: [
    { label: 'FAQ', href: '#faq' },
    { label: 'Cardápio demo', href: `/${NIMBUS_DEMO_SLUG}` },
  ],
  legal: [
    { label: 'Privacidade', href: '/privacidade?from=%2F' },
    { label: 'Termos', href: '/termos?from=%2F' },
  ],
};
