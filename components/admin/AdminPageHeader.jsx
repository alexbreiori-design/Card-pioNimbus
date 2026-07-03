'use client';

import AdminIcon from './AdminIcon';

export default function AdminPageHeader({ title, icon, iconNode = null, actions = null }) {
  return (
    <div className="admin-store-actions-row admin-page-heading">
      <div className="admin-page-title">
        {iconNode || (icon ? (
          <span className="admin-page-title-icon">
            <AdminIcon name={icon} />
          </span>
        ) : null)}
        <span>{title}</span>
      </div>
      {actions}
    </div>
  );
}
