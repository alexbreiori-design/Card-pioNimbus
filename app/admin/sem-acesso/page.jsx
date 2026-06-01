import AdminLogoutButton from '@/components/admin/AdminLogoutButton';

export const metadata = {
  title: 'Sem acesso — Admin',
};

export default function AdminSemAcessoPage() {
  return (
    <div className="admin-sem-acesso">
      <div className="admin-sem-acesso-card">
        <h1>Sem acesso ao painel</h1>
        <p>
          Sua conta está autenticada, mas não está vinculada a nenhuma loja. Peça ao administrador
          para adicionar seu usuário em <strong>empresa_membros</strong> no Supabase.
        </p>
        <p className="admin-sem-acesso-hint">
          Script de referência: <code>supabase/scripts/vincular_usuario_empresa.sql</code>
        </p>
        <AdminLogoutButton />
      </div>
    </div>
  );
}
