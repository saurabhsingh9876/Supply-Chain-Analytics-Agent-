import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import DataTable from '../DataTable/DataTable';
import '../../animations.css';
import './ResultPanel.css';

const RATINGS = [
  { value: 'excellent', label: '⭐ Excellent', color: '#4ade80' },
  { value: 'moderate',  label: '👍 Moderate',  color: '#60a5fa' },
  { value: 'average',   label: '😐 Average',   color: '#f59e0b' },
  { value: 'worst',     label: '👎 Worst',     color: '#f87171' },
];

function exportCSV(table, filename) {
  if (!table || table.length === 0) return;
  const headers = Object.keys(table[0]);
  const rows = table.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ResultPanel({ result, question, onRate, currentRating }) {
  const [tab, setTab]                   = useState('narrative');
  const [selectedRating, setSelectedRating] = useState(currentRating || '');
  const [rated, setRated]               = useState(!!currentRating);

  const { tool_name, table, summary, narrative, trace, tokens_used, latency_ms, extra_data } = result;
  const ratingObj = RATINGS.find(r => r.value === selectedRating);

  const handleSubmitRating = () => {
    if (!selectedRating) return;
    onRate && onRate(selectedRating);
    setRated(true);
  };

  const tabs = [
    { id: 'narrative', label: 'Analysis' },
    { id: 'table',     label: `Data (${table?.length ?? 0} rows)` },
    { id: 'trace',     label: 'Trace' },
  ];

  return (
    <div className="rp-card fade-in">

      {/* ── Tab bar with rating in top-right ── */}
      <div className="rp-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`rp-tab${tab === t.id ? ' rp-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}

        <div className="rp-tabs-right">
          {/* Rating — always visible in top-right */}
          <div className="rp-rating-bar">
            <span className="rp-rating-label">Rate:</span>
            {rated ? (
              <span className="rp-rating-saved" style={{ color: ratingObj?.color || '#4ade80' }}>
                {ratingObj?.label || selectedRating} ✓
              </span>
            ) : (
              <>
                <select
                  className="rp-rating-select"
                  value={selectedRating}
                  style={{ color: ratingObj?.color || '#e2e8f0' }}
                  onChange={e => setSelectedRating(e.target.value)}
                >
                  <option value="">-- rate --</option>
                  {RATINGS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <button
                  className="rp-rating-btn"
                  onClick={handleSubmitRating}
                  disabled={!selectedRating}
                >
                  Save
                </button>
              </>
            )}
          </div>

          {/* Export CSV */}
          {table && table.length > 0 && (
            <button
              className="rp-export-btn"
              onClick={() => exportCSV(table, `${tool_name}_results.csv`)}
            >
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="rp-body">

        {tab === 'narrative' && (
          <div>
            <div className="rp-section-label">Question</div>
            <div className="rp-question-block">{question}</div>
            <div className="rp-section-label">Analysis</div>
            <div className="rp-narrative">
              <ReactMarkdown>{narrative || summary}</ReactMarkdown>
            </div>
          </div>
        )}

        {tab === 'table' && (
          <div>
            {table && table.length > 0 ? (
              <DataTable data={table} />
            ) : (
              <div className="rp-empty-table">No tabular data available</div>
            )}
            {extra_data && Object.keys(extra_data).length > 0 && (
              <div style={{ marginTop: '20px' }}>
                {Object.entries(extra_data).map(([key, val]) =>
                  Array.isArray(val) && val.length > 0 ? (
                    <div key={key} style={{ marginBottom: '18px' }}>
                      <div className="rp-section-label" style={{ marginBottom: '8px' }}>
                        {key.replace(/_/g, ' ')}
                      </div>
                      <DataTable data={val} />
                    </div>
                  ) : null
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'trace' && (
          <div>
            <div className="rp-section-label">Agent Planning Trace</div>
            <div className="rp-trace-box">
              {trace && trace.map((line, i) => {
                const isError   = line.includes('error') || line.includes('failed');
                const isSuccess = line.includes('selected') || line.includes('generated');
                const lineColor  = isError ? '#f87171' : isSuccess ? '#4ade80' : '#94a3b8';
                const indexBg    = isError ? 'rgba(239,68,68,0.15)' : isSuccess ? 'rgba(74,222,128,0.15)' : 'rgba(71,85,105,0.3)';
                const indexColor = isError ? '#f87171' : isSuccess ? '#4ade80' : '#64748b';
                return (
                  <div key={i} className="rp-trace-line">
                    <span className="rp-trace-index" style={{ background: indexBg, color: indexColor }}>{i + 1}</span>
                    <span style={{ color: lineColor, lineHeight: 1.5 }}>{line}</span>
                  </div>
                );
              })}
            </div>
            <div className="rp-meta-row">
              <span>Tool: <strong style={{ color: '#60a5fa' }}>{tool_name}</strong></span>
              <span>Tokens: <strong style={{ color: '#a78bfa' }}>{tokens_used}</strong></span>
              <span>Latency: <strong style={{ color: '#4ade80' }}>{latency_ms}ms</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
