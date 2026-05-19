import React, { useState, useMemo } from 'react';

const s = {
  wrapper: {
    overflowX: 'auto',
    borderRadius: '10px',
    border: '1px solid rgba(51,65,85,0.6)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: {
    background: 'rgba(10,15,30,0.8)',
    color: '#64748b',
    padding: '10px 14px',
    textAlign: 'left',
    fontWeight: 700,
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: '1px solid rgba(51,65,85,0.6)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    transition: 'color 0.15s, background 0.15s',
  },
  thHover: {
    color: '#94a3b8',
    background: 'rgba(15,23,42,0.9)',
  },
  td: {
    padding: '9px 14px',
    borderBottom: '1px solid rgba(15,23,42,0.6)',
    color: '#cbd5e1',
    whiteSpace: 'nowrap',
    fontSize: '13px',
  },
  trEven: { background: 'rgba(30,41,59,0.5)' },
  trOdd: { background: 'rgba(23,32,51,0.4)' },
  trHover: { background: 'rgba(59,130,246,0.06)' },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 14px',
    background: 'rgba(10,15,30,0.6)',
    borderTop: '1px solid rgba(51,65,85,0.5)',
    fontSize: '12px',
    color: '#475569',
  },
  pgBtn: {
    background: 'rgba(30,41,59,0.8)',
    border: '1px solid rgba(51,65,85,0.6)',
    color: '#64748b',
    borderRadius: '6px',
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'background 0.15s, color 0.15s, border-color 0.15s',
    fontWeight: 600,
  },
  pgBtnDisabled: {
    opacity: 0.35,
    cursor: 'not-allowed',
  },
};

function fmt(val) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? '✓' : '✗';
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return val.toLocaleString();
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(val);
}

function isNegative(val) {
  return typeof val === 'number' && val < 0;
}

function isPositive(val) {
  return typeof val === 'number' && val > 0;
}

const PAGE_SIZE = 25;

export default function DataTable({ data }) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [hoveredTh, setHoveredTh] = useState(null);

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
  const pageData = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
    setPage(0);
  };

  return (
    <div>
      <div style={s.wrapper}>
        <table style={s.table}>
          <thead>
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  style={{
                    ...s.th,
                    ...(hoveredTh === h ? s.thHover : {}),
                    color: sortCol === h ? '#60a5fa' : (hoveredTh === h ? '#94a3b8' : '#64748b'),
                  }}
                  onClick={() => handleSort(h)}
                  onMouseEnter={() => setHoveredTh(h)}
                  onMouseLeave={() => setHoveredTh(null)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {h}
                    {sortCol === h ? (
                      <span style={{ color: '#3b82f6', fontSize: '10px' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
                    ) : (
                      <span style={{ color: '#334155', fontSize: '10px', opacity: hoveredTh === h ? 1 : 0 }}>↕</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => (
              <tr
                key={i}
                style={hoveredRow === i ? s.trHover : (i % 2 === 0 ? s.trEven : s.trOdd)}
                onMouseEnter={() => setHoveredRow(i)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {headers.map((h) => {
                  const isMargin = h.toLowerCase().includes('margin');
                  const isRevenue = h.toLowerCase().includes('revenue');
                  const neg = isNegative(row[h]);
                  const pos = isPositive(row[h]) && isMargin;
                  return (
                    <td key={h} style={{
                      ...s.td,
                      color: neg ? '#f87171' : pos ? '#4ade80' : '#cbd5e1',
                      fontWeight: isMargin || isRevenue ? 600 : 400,
                    }}>
                      {fmt(row[h])}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div style={s.pagination}>
          <button
            style={{ ...s.pgBtn, ...(page === 0 ? s.pgBtnDisabled : {}) }}
            onClick={() => setPage(0)}
            disabled={page === 0}
          >«</button>
          <button
            style={{ ...s.pgBtn, ...(page === 0 ? s.pgBtnDisabled : {}) }}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >‹</button>
          <span style={{ padding: '0 8px', color: '#64748b' }}>
            Page <strong style={{ color: '#94a3b8' }}>{page + 1}</strong> of <strong style={{ color: '#94a3b8' }}>{totalPages}</strong>
            <span style={{ marginLeft: '8px', color: '#475569' }}>({sorted.length} rows)</span>
          </span>
          <button
            style={{ ...s.pgBtn, ...(page === totalPages - 1 ? s.pgBtnDisabled : {}) }}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
          >›</button>
          <button
            style={{ ...s.pgBtn, ...(page === totalPages - 1 ? s.pgBtnDisabled : {}) }}
            onClick={() => setPage(totalPages - 1)}
            disabled={page === totalPages - 1}
          >»</button>
        </div>
      )}
    </div>
  );
}
