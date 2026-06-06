import AdminFileIcon from '@/components/admin/AdminFileIcon';
import { getSuperAdminIconPath } from '@/lib/superAdminIcons';

export default function SuperAdminNavIcon({ name }) {
  const src = getSuperAdminIconPath(name);
  if (!src) return null;
  return <AdminFileIcon src={src} className="admin-sistema-nav-icon" />;
}
