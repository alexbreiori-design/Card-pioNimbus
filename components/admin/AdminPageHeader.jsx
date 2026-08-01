'use client';

import AdminIcon from './AdminIcon';

export default function AdminPageHeader({
  title,
  icon,
  iconNode = null,
  actions = null,
  description = null,
}) {
  return (
    <div className="admin-store-actions-row admin-page-heading">
      <div className="admin-page-heading-main">
        <div className="admin-page-title">
          {iconNode || icon ? (
            <span className="admin-page-title-icon">
              {iconNode || <AdminIcon name={icon} />}
            </span>
          ) : null}
          <span>{title}</span>
        </div>
        {description ? <p className="admin-page-description">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}
