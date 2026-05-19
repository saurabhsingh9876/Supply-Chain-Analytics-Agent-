import React, { useState } from 'react';

const CATEGORIES = {
  'SKU Profitability': ['Q1', 'Q2', 'Q3', 'Q4'],
  'Customer': ['Q5', 'Q6', 'Q7', 'Q8'],
  'Shipping': ['Q9', 'Q10', 'Q11', 'Q12'],
  'Budget': ['Q13', 'Q14', 'Q15'],
  'Strategic': ['Q16', 'Q17', 'Q18', 'Q19', 'Q20'],
};

const CAT_COLORS = {
  'SKU Profitability': '#3b82f6',
  'Customer': '#8b5cf6',
  'Shipping': '#f59e0b',
  'Budget': '#10b981',
  'Strategic': '#ef4444',
};

const CAT_BG = {
  'SKU Profitability': 'rgba(59,130,246,0.06)',
  'Customer': 'rgba(139,92,246,0.06)',
  'Shipping': 'rgba(245,158,11,0.06)',
  'Budget': 'rgba(16,185,129,0.06)',
  'Strategic': 'rgba(239,68,68,0.06)',
};

const s = {
  card: {
    background: 'linear-gradient(145deg, #1e293b, #1a2540)',
    border: '1px solid rgba(51,65,85,0.8)',
    borderRadius: '14px',
    overflow: 'hidden',
    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
  },
  header: {
    padding: '12px 16px',
    background: 'rgba(10,15,30,0.6)',
    borderBottom: '1px solid rgba(51,65,85,0.6)',
    fontSize: '11px',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  catHeader: {
    padding: '8px 14px',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(30,41,59,0.8)',
    transition: 'background 0.15s',
  },
  qItem: {
    padding: '7px 14px 7px 18px',
    fontSize: '12px',
    color: '#64748b',
    cursor: 'pointer',
    borderBottom: '1px solid rgba(15,23,42,0.6)',
    lineHeight: 1.45,
    transition: 'background 0.15s, color 0.15s, border-left-color 0.15s',
    borderLeft: '3px solid transparent',
  },
  histItem: {
    padding: '9px 14px',
    fontSize: '12px',
    color: '#64748b',
    cursor: 'pointer',
    borderBottom: '1px solid rgba(15,23,42,0.6)',
    lineHeight: 1.4,
    transition: 'background 0.15s',
    borderLeft: '3px solid transparent',
  },
};

export default function SampleQuestions({ questions, onSelect, history, onHistoryClick }) {
  const [openCats, setOpenCats] = useState({ 'SKU Profitability': true });
  const [hoveredQ, setHoveredQ] = useState(null);
  const [hoveredHist, setHoveredHist] = useState(null);

  const toggleCat = (cat) => setOpenCats((o) => ({ ...o, [cat]: !o[cat] }));

  const qMap = {};
  questions.forEach((q) => { qMap[q.id] = q.text; });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={s.card}>
        <div style={s.header}>
          <span>📋</span>
          <span>Sample Questions</span>
          <span style={{ marginLeft: 'auto', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', borderRadius: '10px', padding: '1px 7px', fontSize: '10px', fontWeight: 700 }}>20</span>
        </div>
        {Object.entries(CATEGORIES).map(([cat, ids]) => (
          <div key={cat}>
            <div
              style={{
                ...s.catHeader,
                color: CAT_COLORS[cat],
                background: openCats[cat] ? CAT_BG[cat] : 'transparent',
              }}
              onClick={() => toggleCat(cat)}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: CAT_COLORS[cat], display: 'inline-block', boxShadow: `0 0 6px ${CAT_COLORS[cat]}` }}></span>
                {cat}
              </span>
              <span style={{ fontSize: '9px', opacity: 0.7 }}>{openCats[cat] ? '▾' : '▸'}</span>
            </div>
            {openCats[cat] && ids.map((id) => (
              <div
                key={id}
                style={{
                  ...s.qItem,
                  background: hoveredQ === id ? CAT_BG[cat] : 'transparent',
                  color: hoveredQ === id ? '#cbd5e1' : '#64748b',
                  borderLeft: `3px solid ${hoveredQ === id ? CAT_COLORS[cat] : 'transparent'}`,
                }}
                onClick={() => onSelect(qMap[id] || '')}
                onMouseEnter={() => setHoveredQ(id)}
                onMouseLeave={() => setHoveredQ(null)}
              >
                <span style={{ color: CAT_COLORS[cat], fontWeight: 700, marginRight: '5px', fontSize: '10px', opacity: 0.8 }}>{id}</span>
                {qMap[id] ? qMap[id].substring(0, 70) + (qMap[id].length > 70 ? '…' : '') : ''}
              </div>
            ))}
          </div>
        ))}
      </div>

      {history && history.length > 0 && (
        <div style={s.card}>
          <div style={s.header}>
            <span>🕐</span>
            <span>Recent</span>
            <span style={{ marginLeft: 'auto', background: 'rgba(139,92,246,0.15)', color: '#a78bfa', borderRadius: '10px', padding: '1px 7px', fontSize: '10px', fontWeight: 700 }}>{history.length}</span>
          </div>
          {history.map((item, i) => (
            <div
              key={i}
              style={{
                ...s.histItem,
                background: hoveredHist === i ? 'rgba(59,130,246,0.06)' : 'transparent',
                color: hoveredHist === i ? '#cbd5e1' : '#64748b',
                borderLeft: `3px solid ${hoveredHist === i ? '#3b82f6' : 'transparent'}`,
              }}
              onClick={() => onHistoryClick(item)}
              onMouseEnter={() => setHoveredHist(i)}
              onMouseLeave={() => setHoveredHist(null)}
            >
              <div style={{ color: '#60a5fa', fontSize: '10px', fontWeight: 600, marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }}></span>
                {item.result?.tool_name}
              </div>
              <div style={{ fontSize: '12px' }}>{item.question.substring(0, 65)}…</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
