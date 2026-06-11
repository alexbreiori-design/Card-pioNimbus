import Link from 'next/link'
import styles from './PricingSection.module.css'

// Ícone de check reutilizável
function Check() {
  return (
    <svg className={styles.check} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function PricingSection() {
  return (
    <section className={styles.section}>
      <div className={styles.wrapper}>

        {/* ── LEFT CARD ── */}
        <div className={styles.leftCard}>
          <div className={styles.leftGlassBorder} />

          <div className={styles.badge}>
            <div className={styles.badgeIcon}>
              <svg viewBox="0 0 12 12"><path d="M6 1l1.2 2.4L10 4.1 8 6l.5 2.9L6 7.6 3.5 8.9 4 6 2 4.1l2.8-.7z" /></svg>
            </div>
            O Cardápio Nimbus Completo
          </div>

          <h1 className={styles.headline}>
            Um preço. <span>Tudo incluso.</span>
          </h1>
          <p className={styles.sub1}>Sem plano Pro, sem módulo extra.</p>
          <p className={styles.sub2}>Valor fixo pelo Cardápio Nimbus completo.</p>
          <hr className={styles.divider} />

          <div className={styles.featuresGrid}>

            {/* VENDAS */}
            <div>
              <div className={styles.featureColHeader}>
                <svg className={styles.featureColIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 01-8 0" />
                </svg>
                <span className={styles.featureColLabel}>Vendas</span>
              </div>
              <ul className={styles.featureList}>
                <li><Check />Cardápio público ilimitado</li>
                <li><Check />Produtos, adicionais, promoções e cupons</li>
                <li><Check />Taxa de entrega por zona e distância</li>
                <li><Check />WhatsApp no fluxo de pedidos</li>
                <li><Check />Pixel do Facebook</li>
              </ul>
            </div>

            {/* OPERAÇÃO */}
            <div>
              <div className={styles.featureColHeader}>
                <svg className={styles.featureColIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" />
                  <line x1="9" y1="7" x2="15" y2="7" />
                  <line x1="9" y1="11" x2="15" y2="11" />
                  <line x1="9" y1="15" x2="13" y2="15" />
                </svg>
                <span className={styles.featureColLabel}>Operação</span>
              </div>
              <ul className={styles.featureList}>
                <li><Check />Painel de pedidos em kanban</li>
                <li><Check />Impressão de ticket térmico</li>
                <li><Check />Múltiplos endereços por cliente</li>
                <li><Check />Troca automática de cardápio por dia</li>
                <li><Check />CRM de clientes</li>
              </ul>
            </div>

            {/* SUPORTE E CRESCIMENTO */}
            <div>
              <div className={styles.featureColHeader}>
                <svg className={styles.featureColIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                <span className={styles.featureColLabel}>Suporte e Crescimento</span>
              </div>
              <ul className={styles.featureList}>
                <li><Check />Suporte 100% humano</li>
                <li><Check />Treinamento incluso</li>
                <li><Check />Ativação em até 48h</li>
                <li><Check />Segmentos adaptados (marmita, pizza e mais)</li>
              </ul>
            </div>

          </div>

          <div className={styles.footerNote}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Tudo o que você precisa para vender mais e gerenciar melhor, em um só lugar.
          </div>
        </div>

        {/* ── RIGHT CARD ── */}
        <div className={styles.rightCard}>

          {/* Sparkles */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={styles.sparkle} />
          ))}

          {/* App icon */}
          <div className={styles.appIcon}>
            <svg viewBox="0 0 48 48" fill="none">
              <path d="M8 28c0-8 5-14 12-16" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M16 34c2-6 7-10 14-11" stroke="rgba(255,255,255,0.6)" strokeWidth="3" strokeLinecap="round" />
              <path d="M24 38c1-3 4-5 8-6" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round" />
              <ellipse cx="32" cy="20" rx="7" ry="5" stroke="white" strokeWidth="3" fill="none" />
              <circle cx="32" cy="20" r="2.5" fill="white" />
            </svg>
          </div>

          {/* Plan chip */}
          <div className={styles.planLabelRow}>
            <span className={styles.planChip}>Nimbus Completo</span>
          </div>

          {/* Price */}
          <div className={styles.priceBlock}>
            <span className={styles.priceCurrency}>R$</span>
            <span className={styles.priceInteger}>149</span>
            <div className={styles.priceCentsWrap}>
              <span className={styles.priceCents}>,90</span>
              <span className={styles.pricePeriod}>/mês</span>
            </div>
          </div>

          <p className={styles.priceDesc}>
            <strong>Tudo incluso</strong> • sem módulos extras
          </p>

          <div className={styles.dividerRight} />

          {/* Info box 1 */}
          <div className={styles.infoBox}>
            <div className={styles.boxIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            </div>
            <p className={styles.boxText}>
              Sem fidelidade no contrato.<br />
              Cancele quando quiser.
            </p>
          </div>

          {/* Info box 2 */}
          <div className={styles.infoBox}>
            <div className={styles.boxIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <p className={styles.boxText}>
              Teste por 7 dias<br />
              <strong style={{ color: '#fff', fontSize: '14px' }}>GRÁTIS!</strong>
            </p>
          </div>

          {/* CTA */}
          <Link href="#" className={styles.ctaBtn}>
            <span>Quero começar agora</span>
            <svg className={styles.arrowIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>

        </div>
      </div>
    </section>
  )
}
