import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import DataTable from './DataTable';

const s = {
  card: {
    background: 'linear-gradient(145deg, #1e293b, #1a2540)',
    border: '1px solid rgba(51,65,85,0.8)',
    borderRadius: '14px',
    overflow: 'hidden',
    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid rgba(51,65,85,0.6)',
    background: 'rgba(10,15,30,0.6)',
  },
  tab: {
    padding: '12px 20px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    color: '#475569',
    borderBottom: '2px solid transparent',
    transition: 'color 0.15s, background 0.15s',
    letterSpacing: '0.01em',
  },
  tabActive: {
    color: '#60a5fa',
    borderBottom: '2px solid #3b82f6',
    background: 'rgba(59,130,246,0.06)',
  },
  body: { padding: '24px' },
  narrative: { lineHeight: 1.75, fontSize: '15px', color: '#cbd5e1' },
  traceBox: {
    background: 'rgba(10,15,30,0.8)',
    borderRadius: '10px',
    padding: '16px',
    fontFamily: '"Fira Code", "Cascadia Code", monospace',
    fontSize: '12px',
    color: '#64748b',
    border: '1px solid rgba(51,65,85,0.5)',
  },
  traceLine: {
    padding: '5px 8px',
    borderRadius: '4px',
    marginBottom: '2px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  },
  exportBtn: {
    background: 'rgba(30,58,95,0.6)',
    color: '#60a5fa',
    border: '1px solid rgba(59,130,246,0.3)',
    borderRadius: '7px',
    padding: '6px 14px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'background 0.15s, border-color 0.15s',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '12px',
  },
  questionBlock: {
    color: '#e2e8f0',
    fontSize: '15px',
    fontWeight: 500,
    marginBottom: '24px',
    padding: '14px 16px',
    background: 'rgba(10,15,30,0.6)',
    borderRadius: '10px',
    borderLeft: '3px solid #3b82f6',
    lineHeight: 1.6,
  },
  metaRow: {
    marginTop: '20px',
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: '#475569',
    paddingTop: '16px',
    borderTop: '1px solid rgba(51,65,85,0.4)',
  },
  metaBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
};

function exportCSV(table, filename) {
  if (!table || table.length === 0) return;
  const headers = Object.keys(table[0]);
  const rows = table.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ResultPanel({ result, question }) {
  const [tab, setTab] = useState('narrative');
  const [exportHover, setExportHover] = useState(false);
  const { tool_name, table, summary, narrative, trace, tokens_used, latency_ms, extra_data } = result;

  const tabs = [
    { id: 'narrative', label: '📝 Analysis' },
    { id: 'table', label: `📊 Data (${table?.length ?? 0} rows)` },
    { id: 'trace', label: '🔍 Trace' },
  ];

  return (
    <div style={s.card}>
      <div style={s.tabs}>
        {tabs.map((t) => (
          <button
            key={t.id}
            style={tab === t.id ? { ...s.tab, ...s.tabActive } : s.tab}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', padding: '0 14px', gap: '8px' }}>
          {table && table.length > 0 && (
            <button
              style={{
                ...s.exportBtn,
                background: exportHover ? 'rgba(37,99,235,0.2)' : 'rgba(30,58,95,0.6)',
                borderColor: exportHover ? 'rgba(59,130,246,0.6)' : 'rgba(59,130,246,0.3)',
              }}
              onClick={() => exportCSV(table, `${tool_name}_results.csv`)}
              onMouseEnter={() => setExportHover(true)}
              onMouseLeave={() => setExportHover(false)}
            >
              <span>⬇</span> Export CSV
            </button>
          )}
        </div>
      </div>

      <div style={s.body}>
        {tab === 'narrative' && (
          <div>
            <div style={s.sectionTitle}>Question</div>
            <div style={s.questionBlock}>{question}</div>
            <div style={s.sectionTitle}>Analysis</div>
            <div style={s.narrative}>
              <ReactMarkdown>{narrative || summary}</ReactMarkdown>
            </div>
          </div>
        )}

        {tab === 'table' && (
          <div>
            {table && table.length > 0 ? (
              <DataTable data={table} />
            ) : (
              <div style={{ color: '#475569', textAlign: 'center', padding: '48px 20px', fontSize: '14px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
                No tabular data available
              </div>
            )}
            {extra_data && Object.keys(extra_data).length > 0 && (
              <div style={{ marginTop: '24px' }}>
                {Object.entries(extra_data).map(([key, val]) => (
                  Array.isArray(val) && val.length > 0 ? (
                    <div key={key} style={{ marginBottom: '20px' }}>
                      <div style={{ ...s.sectionTitle, marginBottom: '10px' }}>{key.replace(/_/g, ' ')}</div>
                      <DataTable data={val} />
                    </div>
                  ) : null
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'trace' && (
          <div>
            <div style={s.sectionTitle}>Agent Planning Trace</div>
            <div style={s.traceBox}>
              {trace && trace.map((line, i) => {
                const isError = line.includes('error') || line.includes('failed');
                const isSuccess = line.includes('selected') || line.includes('generated');
                const lineColor = isError ? '#f87171' : isSuccess ? '#4ade80' : '#94a3b8';
                const lineBg = isError ? 'rgba(239,68,68,0.05)' : isSuccess ? 'rgba(74,222,128,0.05)' : 'transparent';
                return (
                  <div key={i} style={{ ...s.traceLine, background: lineBg }}>
                    <span style={{
                      background: isError ? 'rgba(239,68,68,0.15)' : isSuccess ? 'rgba(74,222,128,0.15)' : 'rgba(71,85,105,0.3)',
                      color: isError ? '#f87171' : isSuccess ? '#4ade80' : '#64748b',
                      borderRadius: '4px',
                      padding: '1px 6px',
                      fontSize: '10px',
                      fontWeight: 700,
                      flexShrink: 0,
                      minWidth: '24px',
                      textAlign: 'center',
                    }}>{i + 1}</span>
                    <span style={{ color: lineColor, lineHeight: 1.5 }}>{line}</span>
                  </div>
                );
              })}
            </div>
            <div style={s.metaRow}>
              <div style={s.metaBadge}>
                <span style={{ color: '#475569' }}>Tool:</span>
                <strong style={{ color: '#60a5fa' }}>{tool_name}</strong>
              </div>
              <div style={s.metaBadge}>
                <span style={{ color: '#475569' }}>Tokens:</span>
                <strong style={{ color: '#a78bfa' }}>{tokens_used}</strong>
              </div>
              <div style={s.metaBadge}>
                <span style={{ color: '#475569' }}>Latency:</span>
                <strong style={{ color: '#4ade80' }}>{latency_ms}ms</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
