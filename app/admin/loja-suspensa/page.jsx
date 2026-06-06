import AdminLogoutButton from '@/components/admin/AdminLogoutButton';

export const metadata = {
  title: 'Loja suspensa — Admin',
};

export default function AdminLojaSuspensaPage() {
  return (
    <div className="admin-sem-acesso">
      <div className="admin-sem-acesso-card">
        <h1>Loja suspensa</h1>
        <p>
          O acesso ao painel desta loja está temporariamente indisponível. Entre em contato com o
          suporte Nimbus para mais informações.
        </p>
        <AdminLogoutButton />
      </div>
    </div>
  );
}
