'use client';

import Image from 'next/image';
import '@phosphor-icons/web/fill/style.css';

const PROVIDERS = {
  mercado_pago: {
    name: 'Mercado Pago',
    logo: '/images/mercadopago-logo.png',
    width: 120,
    height: 32,
  },
  asaas: {
    name: 'Asaas',
    logo: '/images/asaas-logo.png',
    width: 100,
    height: 28,
  },
  pagbank: {
    name: 'PagBank',
    logo: '/images/PagBank-logo.png',
    width: 120,
    height: 32,
  },
};

export default function OnlinePaymentTrustBlock({ provider }) {
  const meta = PROVIDERS[provider];
  if (!meta) return null;

  return (
    <aside className="checkout-pay-trust" aria-label="Pagamento seguro">
      <div className="checkout-pay-trust-main">
        <i
          className="ph-fill ph-seal-check checkout-pay-trust-seal"
          aria-hidden="true"
        />
        <div className="checkout-pay-trust-copy">
          <p className="checkout-pay-trust-title">
            <span>Pagamento seguro garantido por</span>
            <Image
              src={meta.logo}
              alt={meta.name}
              width={meta.width}
              height={meta.height}
              className="checkout-pay-trust-logo-img"
            />
          </p>
          <p className="checkout-pay-trust-caption">
            Os dados são criptografados e não serão armazenados.
          </p>
        </div>
      </div>
    </aside>
  );
}
