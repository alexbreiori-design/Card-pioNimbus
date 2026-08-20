import { NIMBUS_DEMO_SLUG, NIMBUS_PRICE, NIMBUS_PRICE_ANNUAL } from '@/lib/landing/constants';

export const landingNav = [
  { id: 'dores', label: 'Por que mudar', navIcon: 'worry' },
  { id: 'proposito', label: 'Solução', navIcon: 'aiMagic' },
  { id: 'recursos', label: 'Funcionalidades', navIcon: 'resourcesAdd' },
  { id: 'preco', label: 'Preço', navIcon: 'tag01' },
  { id: 'faq', label: 'Dúvidas', navIcon: 'quiz05' },
];

export const landingHero = {
  titleBefore: 'O cardápio mais',
  titleAfter: 'para o seu restaurante.',
  titleWords: ['bonito', 'prático', 'honesto'],
  lead: 'Um cardápio bonito para o seu cliente,\nprático para a equipe e honesto para o seu bolso.',
  hint: 'Clique no aparelho para experimentar',
  calloutTitle: 'Comprove a melhor\nexperiência de compra!',
  calloutSub: 'Clique em um dos dispositivos e teste.',
  demoClose: 'Fechar demonstração',
  calloutSubMobile: 'Toque no celular para testar.',
  demoCta: 'Solicite uma Demonstração',
  demoCtaMessage:
    'Olá! Gostaria de solicitar uma demonstração do Cardápio Nimbus para o meu restaurante.',
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
  body: 'Talvez você já tenha testado outras opções. Talvez já tenha\nse frustrado com sistemas complicados, taxas altas ou\nque prometem muito e entregam pouco.',
  mascotSrc: '/images/landing/mascote-page.webp',
  mascotAlt: 'Mascote Nimbus',
  bubbles: [
    {
      icon: 'clock',
      tone: 'purple',
      text: 'Perco muito tempo respondendo pedidos no WhatsApp.',
    },
    {
      icon: 'trendUp',
      tone: 'green',
      text: 'Eu só quero é vender mais e ter menos dor de cabeça.',
    },
    {
      icon: 'user',
      tone: 'blue',
      text: 'Meus clientes reclamam que é difícil fazer o pedido.',
    },
    {
      icon: 'calculator',
      tone: 'pink',
      text: 'Os sistemas são caros e nenhum pouco práticos.',
    },
  ],
  reality: {
    eyebrow: 'A realidade do delivery hoje',
    title: 'Você lida com muitos\ndesafios todos os dias',
    lead: 'E a maioria dos cardápios digitais só\nadiciona mais um problema.',
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
      descriptionBefore: 'Porque o cardápio é a ',
      descriptionBold: 'primeira impressão',
      descriptionAfter: ' do seu restaurante.',
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
      descriptionBefore: 'Porque você merece um sistema que realmente ',
      descriptionBold: 'resolve seus problemas',
      descriptionAfter: '.',
      bullets: [
        'Preço justo',
        'Funções úteis',
        'Ativação rápida',
        'Suporte humano',
        'Treinamento prático',
        'Melhorias constantes',
      ],
      piggyImage: '/images/landing/features/purpose-honesto-piggy.png?v=2',
      piggyAlt: 'Cofrinho ilustrando preço justo',
      mascotImage: '/images/landing/features/mascote-nuvem.png',
      mascotAlt: 'Mascote Nimbus',
    },
  ],
  bannerLine1: 'Mais do que um cardápio digital, o Nimbus é feito para o',
  bannerLine2: 'dia a dia do seu restaurante.',
};

export const landingFeaturesShowcase = {
  eyebrow: 'Tudo o que seu restaurante precisa',
  titleBefore: 'Um sistema ',
  titleHighlight: 'completo',
  titleMid: ' para',
  titleAfter: 'cuidar do seu restaurante, do início ao fim.',
  footerNote: 'E isso é só uma fração do que o nosso sistema tem a oferecer!',
  footerCta: 'Ver todas as funcionalidades',
  categories: [
    {
      id: 'venda-online',
      icon: 'bag',
      tone: 'violet',
      title: 'Venda online',
      summary: 'Cardápio e pedido do cliente',
      description:
        'Seu cliente encontra tudo com facilidade e faz o pedido em poucos minutos, do jeito que preferir.',
      image: '/images/landing/features/feature-venda-online.png',
      imageAlt: 'Cardápio e pedido online no Nimbus',
      chips: [
        { icon: 'menu', label: 'Cardápio personalizado' },
        { icon: 'currency', label: 'Pagamentos online' },
        { icon: 'sparkle', label: 'Visual inteligente' },
        { icon: 'check', label: 'Fácil e prático de usar' },
      ],
    },
    {
      id: 'pedidos',
      icon: 'orders',
      tone: 'pink',
      title: 'Pedidos',
      summary: 'Recebimento e gestão de pedidos',
      description:
        'Cada pedido chega organizado e sua equipe acompanha tudo sem perder tempo ou deixar algo passar.',
      image: '/images/landing/features/feature-pedidos.png',
      imageAlt: 'Painel de pedidos do Nimbus',
      chips: [
        { icon: 'orders', label: 'Pedidos organizados' },
        { icon: 'store', label: 'Vendas no balcão' },
        { icon: 'steps', label: 'Simples de acompanhar' },
        { icon: 'config', label: 'Informações claras dos pedidos' },
      ],
    },
    {
      id: 'entregas',
      icon: 'truck',
      tone: 'blue',
      title: 'Entregas',
      summary: 'Rotas e status de entrega',
      description:
        'Agrupe rotas por região, escolha entre a rota mais curta ou com mais prioridade e saiba exatamente quando o entregador finalizou a entrega do pedido.',
      image: '/images/landing/features/feature-entregas.png',
      imageAlt: 'Rotas e entregas no Nimbus',
      chips: [
        { icon: 'mapPin', label: 'Rotas de entrega automáticas' },
        { icon: 'grid', label: 'Agrupamento por proximidade' },
        { icon: 'check', label: 'O entregador confirma a entrega' },
        { icon: 'clock', label: 'Ajuste de rota por urgência' },
      ],
    },
    {
      id: 'gestao',
      icon: 'trendUp',
      tone: 'emerald',
      title: 'Gestão',
      summary: 'Relatórios e desempenho',
      description:
        'Veja o que realmente importa para tomar decisões mais inteligentes e acompanhar o crescimento da sua loja.',
      image: '/images/landing/features/feature-gestao.png',
      imageAlt: 'Relatórios e métricas no Nimbus',
      chips: [
        { icon: 'trendUp', label: 'Relatórios completos' },
        { icon: 'calculator', label: 'Métricas de conversão' },
        { icon: 'user', label: 'Histórico de clientes' },
        { icon: 'star', label: 'Produtos mais vendidos' },
      ],
    },
    {
      id: 'personalizacao',
      icon: 'palette',
      tone: 'orange',
      title: 'Personalização',
      summary: 'Identidade e visual da loja',
      description:
        'Deixe o cardápio com a identidade do seu restaurante e publique tudo com poucos cliques.',
      image: '/images/landing/features/feature-personalizacao.png',
      imageAlt: 'Personalização da loja no Nimbus',
      chips: [
        { icon: 'palette', label: 'As cores da sua marca' },
        { icon: 'star', label: 'Visual único e exclusivo' },
        { icon: 'clock', label: 'Horários automáticos' },
        { icon: 'config', label: 'Personalização total' },
      ],
    },
  ],
};

export const landingFeaturesCatalog = {
  title: 'Todas as funcionalidades',
  closeLabel: 'Fechar',
  ctaLabel: 'Quero começar agora',
  groups: [
    {
      id: 'venda-online',
      icon: 'bag',
      tone: 'violet',
      title: 'Venda online',
      summary: 'Cardápio e pedido do cliente',
      items: [
        { icon: 'menu', label: 'Cardápio público ilimitado' },
        { icon: 'currency', label: 'Pagamentos online' },
        { icon: 'tag', label: 'Cupons e promoções' },
        { icon: 'whatsapp', label: 'WhatsApp no pedido' },
        { icon: 'link', label: 'Pixel do Facebook' },
        { icon: 'store', label: 'Segmentos pizza e marmita' },
      ],
    },
    {
      id: 'pedidos',
      icon: 'orders',
      tone: 'pink',
      title: 'Pedidos',
      summary: 'Recebimento e gestão de pedidos',
      items: [
        { icon: 'orders', label: 'Painel de pedidos em kanban' },
        { icon: 'store', label: 'Vendas no balcão' },
        { icon: 'bell', label: 'Impressão de ticket térmico' },
        { icon: 'steps', label: 'Status claros do pedido' },
        { icon: 'sparkle', label: 'Produtos e adicionais' },
        { icon: 'mapPin', label: 'Múltiplos endereços' },
      ],
    },
    {
      id: 'entregas',
      icon: 'truck',
      tone: 'blue',
      title: 'Entregas',
      summary: 'Rotas e status de entrega',
      items: [
        { icon: 'mapPin', label: 'Taxa por zona e distância' },
        { icon: 'truck', label: 'Rotas de entrega automáticas' },
        { icon: 'grid', label: 'Agrupamento por proximidade' },
        { icon: 'check', label: 'Entregador confirma a entrega' },
        { icon: 'clock', label: 'Ajuste de rota por urgência' },
        { icon: 'steps', label: 'Acompanhamento em tempo real' },
      ],
    },
    {
      id: 'gestao',
      icon: 'trendUp',
      tone: 'emerald',
      title: 'Gestão',
      summary: 'Relatórios e desempenho',
      items: [
        { icon: 'trendUp', label: 'Relatórios completos' },
        { icon: 'calculator', label: 'Métricas de conversão' },
        { icon: 'user', label: 'CRM e histórico de clientes' },
        { icon: 'star', label: 'Produtos mais vendidos' },
        { icon: 'bars', label: 'Métricas do dia a dia' },
        { icon: 'headphones', label: 'Suporte humano incluso' },
      ],
    },
    {
      id: 'personalizacao',
      icon: 'palette',
      tone: 'orange',
      title: 'Personalização',
      summary: 'Identidade e visual da loja',
      items: [
        { icon: 'palette', label: 'Cores da sua marca' },
        { icon: 'star', label: 'Visual único e exclusivo' },
        { icon: 'clock', label: 'Horários automáticos' },
        { icon: 'menu', label: 'Cardápio por dia da semana' },
        { icon: 'image', label: 'Fotos e identidade visual' },
        { icon: 'config', label: 'Personalização total' },
      ],
    },
  ],
};

export const landingPricing = {
  eyebrow: 'Agora pra sua surpresa...',
  sectionTitleBefore: 'Você não precisa ',
  sectionTitleHighlight: 'pagar uma fortuna',
  sectionTitleAfter: ' pra ter um sistema completo!',
  title: 'Um preço. Tudo incluso.',
  highlightText: 'Sem planos nem módulos, valor fixo com desconto especial para início.',
  planName: 'Nimbus Completo',
  compareAtPrice: 'R$ 259,90',
  monthlyPrice: NIMBUS_PRICE,
  price: NIMBUS_PRICE_ANNUAL,
  annualDiscountLabel: '42% Off',
  monthlyBillingNote: {
    primary: 'Cobrança recorrente',
    secondary: 'via cartão',
  },
  annualBillingNote: {
    primary: 'Cobrança única',
    secondary: 'renovação anual',
  },
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

export const landingCta = {
  titleBefore: 'Está pronto para ter o ',
  titleHighlight: 'melhor cardápio digital',
  titleAfter: ' que a sua loja poderia querer?',
  cta: 'Quero começar agora',
};

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
    a: 'Não. R$ 199,90/mês no plano mensal (ou o equivalente a R$ 149,90/mês no anual), com tudo incluso e sem taxa em cima de cada venda.',
  },
  {
    q: 'Quais são as formas de pagamento para o cliente?',
    a: 'O cliente pode pagar online com pix ou cartão e na entrega com cartão ou dinheiro.',
  },
  {
    q: 'Como funciona a taxa de entrega?',
    a: 'Diferente dos concorrentes, a taxa não é calculada em linha reta. Nosso sistema calcula a distância real pela melhor rota.',
  },
  {
    q: 'Em quanto tempo fica pronto?',
    a: 'Ativação em até 48 horas a partir da contratação, com acompanhamento da nossa equipe.',
  },
  {
    q: 'O sistema só serve para lanchonete?',
    a: 'Não, o sistema é projetado pra todo tipo de nicho de delivery gastronômico porém ele se adapta a cada nicho pra cada loja visualizar só o que for útil pra ela.',
  },
];

export const landingFooter = {
  product: [
    { label: 'Por que mudar', href: '#dores' },
    { label: 'Nossa visão', href: '#proposito' },
    { label: 'O sistema', href: '#recursos' },
    { label: 'Preço', href: '#preco' },
    { label: 'Ver exemplo', href: `/${NIMBUS_DEMO_SLUG}` },
  ],
  company: [
    { label: 'Falar no WhatsApp', href: 'whatsapp' },
    { label: 'Login lojista', href: '/login' },
  ],
  resources: [
    { label: 'Dúvidas', href: '#faq' },
    { label: 'Cardápio demo', href: `/${NIMBUS_DEMO_SLUG}` },
  ],
  legal: [
    { label: 'Privacidade', href: '/privacidade?from=%2F' },
    { label: 'Termos', href: '/termos?from=%2F' },
  ],
};
