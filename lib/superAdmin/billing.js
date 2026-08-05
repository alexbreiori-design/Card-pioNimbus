import { normalizeSlug } from '@/lib/normalize';
import { getStripe } from '@/lib/stripe/client';

/** Empresa mínima para operações de billing (checkout/portal/CRM). */
export async function resolveEmpresaForBilling(supabase, slug) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) return null;
  const { data, error } = await supabase
    .from('empresas')
    .select('id, slug, nome, email')
    .eq('slug', safeSlug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** E-mail do proprietário ativo da loja (fallback: e-mail cadastrado na empresa). */
export async function resolveOwnerEmail(supabase, empresaId, fallbackEmail = null) {
  const { data: membros, error } = await supabase
    .from('empresa_membros')
    .select('usuario_id, papel, ativo')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const proprietario = (membros || []).find((row) => row.papel === 'proprietario') || (membros || [])[0];
  if (!proprietario?.usuario_id) return fallbackEmail || null;

  const { data } = await supabase.auth.admin.getUserById(proprietario.usuario_id);
  return data?.user?.email || fallbackEmail || null;
}

export async function loadAssinaturaRow(supabase, empresaId) {
  if (!empresaId) return null;
  const { data, error } = await supabase
    .from('empresa_assinaturas')
    .select('*')
    .eq('empresa_id', empresaId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Garante um customer Stripe para a empresa, reaproveitando o já salvo quando possível. */
export async function ensureStripeCustomer(supabase, { empresaId, slug, nome, ownerEmail, existingCustomerId }) {
  const stripe = getStripe();
  if (!stripe) {
    throw Object.assign(new Error('Stripe não configurado (STRIPE_SECRET_KEY ausente).'), { status: 503 });
  }

  if (existingCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(existingCustomerId);
      if (customer && !customer.deleted) return customer.id;
    } catch {
      /* customer removido ou inválido no Stripe — recria abaixo */
    }
  }

  const customer = await stripe.customers.create({
    email: ownerEmail || undefined,
    name: nome || slug,
    metadata: { empresa_id: empresaId, slug },
  });

  const { error } = await supabase.from('empresa_assinaturas').upsert(
    {
      empresa_id: empresaId,
      stripe_customer_id: customer.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'empresa_id' }
  );
  if (error) throw error;

  return customer.id;
}
