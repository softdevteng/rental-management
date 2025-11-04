import React from 'react';
import EstateSummary from './EstateSummary';
import AnalyticsSummary from './AnalyticsSummary';

export default function DashboardPage() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
      <div>
        <EstateSummary />
      </div>
      <aside>
        <AnalyticsSummary />
      </aside>
    </div>
  );
}
