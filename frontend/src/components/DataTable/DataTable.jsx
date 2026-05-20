import React, { useState, useMemo } from 'react';
import './DataTable.css';

const PAGE_SIZE = 25;

function fmt(val) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'number') {
    if (Number.isInteger(val))
      return val.toLocaleString();
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(val);
}

export default function DataTable({ data }) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage]       = useState(0);

  if (!data || data.length === 0) return null;
  const headers = Object.keys(data[0]);

  const sorted = useMemo(() => {
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      if (av === bv) return 0;
      const cmp = av < bv ? -1 : 1;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortCol, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageData   = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(0);
  };

  return (
    <div>
      <div className="dt-wrapper">
        <table className="dt-table">
          <thead>
            <tr>
              {headers.map(h => (
                <th
                  key={h}
                  className={`dt-th${sortCol === h ? ' dt-th--active' : ''}`}
                  onClick={() => handleSort(h)}
                >
                  {h}
                  {sortCol === h
                    ? <span className="dt-sort-arrow">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    : <span className="dt-sort-arrow dt-sort-idle">↕</span>
                  }
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'dt-tr--even' : 'dt-tr--odd'}>
                {headers.map(h => {
                  const isMargin  = h.toLowerCase().includes('margin');
                  const isRevenue = h.toLowerCase().includes('revenue');
                  const val = row[h];
                  const isNeg = typeof val === 'number' && val < 0;
                  const isPos = typeof val === 'number' && val > 0 && isMargin;
                  const cls = [
                    'dt-td',
                    isNeg ? 'dt-td--neg' : isPos ? 'dt-td--pos' : '',
                    (isMargin || isRevenue) ? 'dt-td--strong' : '',
                  ].filter(Boolean).join(' ');
                  return <td key={h} className={cls}>{fmt(val)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="dt-pagination">
          <button className="dt-pg-btn" onClick={() => setPage(0)} disabled={page === 0}>«</button>
          <button className="dt-pg-btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>‹</button>
          <span className="dt-pg-info">
            Page <strong className="dt-pg-strong">{page + 1}</strong> of{' '}
            <strong className="dt-pg-strong">{totalPages}</strong>
            <span className="dt-pg-count">({sorted.length} rows)</span>
          </span>
          <button className="dt-pg-btn" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>›</button>
          <button className="dt-pg-btn" onClick={() => setPage(totalPages - 1)} disabled={page === totalPages - 1}>»</button>
        </div>
      )}
    </div>
  );
}
