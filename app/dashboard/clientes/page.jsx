import { redirect } from 'next/navigation';

export default function DashboardClientesRedirect() {
  redirect('/admin/clientes');
}

