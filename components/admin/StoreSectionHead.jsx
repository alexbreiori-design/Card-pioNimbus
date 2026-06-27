'use client';

import AdminIcon from '@/components/admin/AdminIcon';

export default function StoreSectionHead({ icon = 'store', iconNode = null, title, hint }) {
  return (
    <div className="admin-store-section-head-v2">
      <div className="admin-store-section-head-v2-main">
        <span className="admin-section-icon">
          {iconNode || <AdminIcon name={icon} />}
        </span>
        <h2>{title}</h2>
      </div>
      {hint ? <span className="admin-store-section-hint">{hint}</span> : null}
    </div>
  );
}
