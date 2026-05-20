import React, { useState } from 'react';
import './SampleQuestions.css';

const CATEGORIES = {
  'SKU Profitability': ['Q1', 'Q2', 'Q3', 'Q4'],
  'Customer':          ['Q5', 'Q6', 'Q7', 'Q8'],
  'Shipping':          ['Q9', 'Q10', 'Q11', 'Q12'],
  'Budget':            ['Q13', 'Q14', 'Q15'],
  'Strategic':         ['Q16', 'Q17', 'Q18', 'Q19', 'Q20'],
};

const CAT_COLORS = {
  'SKU Profitability': '#3b82f6',
  'Customer':          '#8b5cf6',
  'Shipping':          '#f59e0b',
  'Budget':            '#10b981',
  'Strategic':         '#ef4444',
};

export default function SampleQuestions({ questions, onSelect, history, onHistoryClick }) {
  const [openCats, setOpenCats] = useState({ 'SKU Profitability': true });

  const toggleCat = (cat) => setOpenCats(o => ({ ...o, [cat]: !o[cat] }));

  const qMap = {};
  questions.forEach(q => { qMap[q.id] = q.text; });

  return (
    <div className="sq-wrapper">

      {/* ── Sample Questions ── */}
      <div className="sq-card">
        <div className="sq-card-header">
          <span>Sample Questions</span>
          <span className="sq-count-badge">20</span>
        </div>

        {Object.entries(CATEGORIES).map(([cat, ids]) => (
          <div key={cat}>
            <div
              className="sq-cat-header"
              style={{ color: CAT_COLORS[cat] }}
              onClick={() => toggleCat(cat)}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <span className="sq-cat-dot" style={{ background: CAT_COLORS[cat] }} />
                {cat}
              </span>
              <span className="sq-cat-arrow">{openCats[cat] ? '▾' : '▸'}</span>
            </div>

            {openCats[cat] && ids.map(id => (
              <div
                key={id}
                className="sq-q-item"
                onClick={() => onSelect(qMap[id] || '')}
                onMouseEnter={e => { e.currentTarget.style.borderLeftColor = CAT_COLORS[cat]; }}
                onMouseLeave={e => { e.currentTarget.style.borderLeftColor = 'transparent'; }}
              >
                <span className="sq-q-id" style={{ color: CAT_COLORS[cat] }}>{id}</span>
                {qMap[id] ? qMap[id].substring(0, 70) + (qMap[id].length > 70 ? '…' : '') : ''}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── Recent History ── */}
      {history && history.length > 0 && (
        <div className="sq-card">
          <div className="sq-card-header">
            <span>Recent</span>
            <span className="sq-count-badge sq-count-badge--hist">{history.length}</span>
          </div>
          {history.map((item, i) => (
            <div key={i} className="sq-hist-item" onClick={() => onHistoryClick(item)}>
              <div className="sq-hist-tool">
                <span className="sq-hist-dot" />
                {item.result?.tool_name}
              </div>
              <div>
                {item.question.substring(0, 65)}{item.question.length > 65 ? '…' : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
