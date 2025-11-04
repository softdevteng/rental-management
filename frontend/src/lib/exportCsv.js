export function exportToCsv(filename, rows) {
  if (!rows || !rows.length) return;
  const header = Object.keys(rows[0]);
  const csv = [header.join(','), ...rows.map(r => header.map(h => {
    const v = r[h] == null ? '' : String(r[h]);
    // Escape quotes
    return '"' + v.replace(/"/g, '""') + '"';
  }).join(','))].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function flattenForCsv(kpis = {}, analytics = {}) {
  // Produce a flattened list of rows combining monthly series
  const months = new Set();
  (kpis.turnover || []).forEach(t => months.add(t.month));
  (kpis.occupancyTrend || []).forEach(o => months.add(o.month));
  (analytics.monthlyRevenue || []).forEach(m => months.add(m.month));
  (analytics.monthlyNewTenants || []).forEach(n => months.add(n.month));
  // include expense months if present
  (kpis.expenseSummary?.monthlyExpenses || []).forEach(e => months.add(e.month));

  const sorted = Array.from(months).sort();
  return sorted.map(month => {
    const t = (kpis.turnover || []).find(x => x.month === month) || {};
    const o = (kpis.occupancyTrend || []).find(x => x.month === month) || {};
    const r = (analytics.monthlyRevenue || []).find(x => x.month === month) || {};
    const n = (analytics.monthlyNewTenants || []).find(x => x.month === month) || {};
    const me = (kpis.expenseSummary?.monthlyExpenses || []).find(x => x.month === month) || {};
    return {
      month,
      newTenants: t.newTenants || 0,
      vacated: t.vacated || 0,
      occupied: o.occupied || 0,
      totalUnits: o.totalUnits || 0,
      occupancyPct: o.occupancyPct || 0,
      collected: r.collected || 0,
      newTenantsCount: n.count || 0,
      expenses: me.total || 0,
    };
  });
}
