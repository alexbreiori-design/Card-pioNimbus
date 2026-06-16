'use client';

import '@/styles/admin-reports.css';
import '@/styles/reportPrint.css';
import ReportsDashboard from '@/components/admin/reports/ReportsDashboard';

export default function RelatoriosPage() {
  return (
    <div className="admin-reports-shell">
      <ReportsDashboard />
    </div>
  );
}
