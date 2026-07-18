import Image from "next/image";

export default function PaymentProviderComingSoonCard({
  logo,
  name,
  description,
  locked = false,
}) {
  return (
    <div
      className={`admin-card admin-store-block-card admin-compact-page-card admin-integration-card admin-payment-provider-card is-coming-soon${
        locked ? " is-locked" : ""
      }`}
      aria-disabled={locked || undefined}
    >
      <div className="admin-integration-meta-wrap admin-integration-meta-wrap-left">
        <Image
          className="admin-payment-provider-logo"
          src={logo}
          alt={name}
          width={180}
          height={48}
        />
        <span
          className={`admin-payment-status${locked ? " is-unavailable" : ""}`}
        >
          {locked ? "Indisponível" : "Em breve"}
        </span>
      </div>

      <p className="admin-help-text admin-delivery-areas-hint">{description}</p>
      <p className="admin-help-text admin-delivery-areas-empty">
        {locked
          ? "Outro provedor já está conectado. Desconecte-o para liberar esta opção no futuro."
          : "Esta integração será disponibilizada em uma próxima etapa."}
      </p>
    </div>
  );
}
