import Image from "next/image";

export default function PaymentProviderComingSoonCard({
  logo,
  name,
  description,
}) {
  return (
    <div className="admin-card admin-store-block-card admin-compact-page-card admin-integration-card admin-payment-provider-card is-coming-soon">
      <div className="admin-integration-meta-wrap admin-integration-meta-wrap-left">
        <Image
          className="admin-payment-provider-logo"
          src={logo}
          alt={name}
          width={180}
          height={48}
        />
        <span className="admin-payment-status">Em breve</span>
      </div>

      <p className="admin-help-text admin-delivery-areas-hint">{description}</p>
      <p className="admin-help-text admin-delivery-areas-empty">
        Esta integração será disponibilizada em uma próxima etapa.
      </p>
    </div>
  );
}
