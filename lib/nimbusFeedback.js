/** Categorias do canal "Fale com a Nimbus". */
export const NIMBUS_FEEDBACK_CATEGORIES = [
  {
    id: 'nova_funcionalidade',
    label: 'Nova funcionalidade',
    hint: 'Algo que ainda não existe e facilitaria o dia a dia.',
    channel: 'inbox',
  },
  {
    id: 'ajuste',
    label: 'Ajuste em algo existente',
    hint: 'Melhoria em uma tela ou fluxo que você já usa.',
    channel: 'inbox',
  },
  {
    id: 'problema',
    label: 'Reportar problema',
    hint: 'Bug, erro ou comportamento inesperado.',
    channel: 'inbox',
  },
  {
    id: 'sugestao',
    label: 'Opinião ou sugestão',
    hint: 'Comentário geral sobre o produto.',
    channel: 'inbox',
  },
  {
    id: 'suporte',
    label: 'Suporte',
    hint: 'Falar com a gente agora no WhatsApp.',
    channel: 'whatsapp',
  },
];

export const NIMBUS_FEEDBACK_STATUS_LABEL = {
  aberto: 'Aberto',
  lido: 'Lido',
  arquivado: 'Arquivado',
};

export function feedbackCategoryLabel(id) {
  return NIMBUS_FEEDBACK_CATEGORIES.find((item) => item.id === id)?.label || id;
}

export function mapNimbusFeedback(row) {
  if (!row) return null;
  return {
    id: row.id,
    empresaId: row.empresa_id,
    autorUserId: row.autor_user_id || null,
    autorEmail: row.autor_email || '',
    autorNome: row.autor_nome || '',
    categoria: row.categoria,
    categoriaLabel: feedbackCategoryLabel(row.categoria),
    mensagem: row.mensagem || '',
    status: row.status || 'aberto',
    statusLabel: NIMBUS_FEEDBACK_STATUS_LABEL[row.status] || row.status,
    createdAt: row.created_at,
    lidoEm: row.lido_em || null,
  };
}

/** Anexa texto pré-preenchido à URL do WhatsApp de suporte. */
export function withWhatsAppPrefill(supportUrl, text) {
  const base = String(supportUrl || '').trim();
  const message = String(text || '').trim();
  if (!base || !message) return base;
  if (!base.includes('wa.me/') && !base.includes('api.whatsapp.com')) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}text=${encodeURIComponent(message)}`;
}
