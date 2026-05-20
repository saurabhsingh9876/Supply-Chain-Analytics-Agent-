import React, { useState, useEffect } from 'react';
import './HeaderTicker.css';

const MESSAGES = [
  '📊 Analyse SKU margins across all pricing tiers',
  '🚚 Track shipping costs by carrier and service type',
  '💰 Compare wholesale vs DTC vs Amazon profitability',
  '📦 Identify top & bottom performing SKUs instantly',
  '📈 Monitor plan vs actual budget variance in real time',
  '🌍 Model tariff impact on Brazilian coffee supply chain',
  '👥 Measure customer concentration risk',
  '🔍 Detect pricing anomalies across customer tiers',
  '📅 Build monthly P&L with one question',
  '⚡ Powered by Claude AI — ask anything in plain English',
];

export default function HeaderTicker() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState('enter'); // 'enter' | 'show' | 'exit'

  useEffect(() => {
    let t;
    if (phase === 'enter') {
      t = setTimeout(() => setPhase('show'), 500);
    } else if (phase === 'show') {
      t = setTimeout(() => setPhase('exit'), 2800);
    } else if (phase === 'exit') {
      t = setTimeout(() => {
        setIndex(i => (i + 1) % MESSAGES.length);
        setPhase('enter');
      }, 500);
    }
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div className="header-ticker">
      <span className={`header-ticker__msg header-ticker__msg--${phase}`}>
        {MESSAGES[index]}
      </span>
    </div>
  );
}
