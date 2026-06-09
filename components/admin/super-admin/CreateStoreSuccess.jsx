'use client';

import { useState } from 'react';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';

export default function CreateStoreSuccess({ result, onClose }) {
  const [copied, setCopied] = useState('');
  const { overlayPointerDown, overlayClick } = useAdminOverlayClose({
    onClose,
    isDirty: false,
  });

  if (!result?.store) return null;

  async function copyText(label, text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(''), 2000);
    } catch {
      setCopied('');
    }
  }

  const lines = [
    ['Cardápio', result.store.cardapioUrl],
    ['Login admin', result.store.loginUrl],
    ['E-mail', result.ownerEmail],
  ];
  if (result.tempPassword) {
    lines.push(['Senha temporária', result.tempPassword]);
  }

  return (
    <div
      className="admin-sistema-modal-backdrop"
      role="presentation"
      onPointerDown={overlayPointerDown}
      onClick={overlayClick}
    >
      <div
        className="admin-sistema-modal admin-sistema-success"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-store-success-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="admin-sistema-modal-header">
          <h2 id="create-store-success-title">Loja criada</h2>
          <button type="button" className="admin-sistema-modal-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </header>

        <p className="admin-sistema-success-lead">
          <strong>{result.store.nome}</strong> ({result.store.slug}) está pronta para configuração.
        </p>

        <ul className="admin-sistema-success-list">
          {lines.map(([label, value]) => (
            <li key={label}>
              <span>{label}</span>
              <code>{value}</code>
              <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => copyText(label, value)}>
                {copied === label ? 'Copiado' : 'Copiar'}
              </button>
            </li>
          ))}
        </ul>

        {result.createdAuthUser ? (
          <p className="admin-sistema-success-hint">
            Oriente o cliente a entrar com a senha temporária. Para trocar depois, use &quot;Esqueceu a senha?&quot; na
            tela de login.
          </p>
        ) : (
          <p className="admin-sistema-success-hint">
            Conta existente vinculada — o cliente usa o mesmo login de sempre e escolhe a nova loja no seletor, se
            tiver mais de uma.
          </p>
        )}

        <footer className="admin-sistema-modal-footer">
          <button type="button" className="admin-btn admin-btn-primary" onClick={onClose}>
            Fechar
          </button>
        </footer>
      </div>
    </div>
  );
}
