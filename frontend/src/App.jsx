import React, { useState, useEffect } from 'react';
import { askQuestion, getSampleQuestions } from './api';
import ResultPanel from './components/ResultPanel';
import SampleQuestions from './components/SampleQuestions';

const styles = {
  app: { minHeight: '100vh', background: 'linear-gradient(135deg, #0a0f1e 0%, #0f172a 50%, #1a2540 100%)', color: '#e2e8f0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  header: {
    background: 'rgba(10,15,30,0.97)',
    borderBottom: '1px solid rgba(59,130,246,0.2)',
    padding: '14px 28px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 20px rgba(0,0,0,0.4)',
    backdropFilter: 'blur(12px)',
  },
  logoWrap: {
    width: '40px', height: '40px', borderRadius: '10px',
    background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '20px', boxShadow: '0 0 16px rgba(59,130,246,0.4)',
    flexShrink: 0,
  },
  logo: { fontSize: '20px' },
  title: { fontSize: '18px', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.01em' },
  subtitle: { fontSize: '12px', color: '#64748b', marginTop: '1px' },
  main: { maxWidth: '1400px', margin: '0 auto', padding: '24px', display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', minHeight: 'calc(100vh - 69px)' },
  sidebar: { display: 'flex', flexDirection: 'column', gap: '14px' },
  content: { display: 'flex', flexDirection: 'column', gap: '16px' },
  inputCard: {
    background: 'linear-gradient(145deg, #1e293b, #1a2540)',
    border: '1px solid rgba(51,65,85,0.8)',
    borderRadius: '14px',
    padding: '20px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
  },
  inputLabel: { fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' },
  textarea: {
    width: '100%', background: '#0a0f1e', border: '1px solid #334155',
    borderRadius: '10px', color: '#f1f5f9', fontSize: '15px', padding: '12px 14px',
    resize: 'vertical', minHeight: '80px', outline: 'none', fontFamily: 'inherit',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
  },
  btnRow: { display: 'flex', gap: '10px', marginTop: '14px' },
  btn: {
    background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
    color: '#fff', border: 'none', borderRadius: '9px',
    padding: '11px 20px', fontSize: '14px', fontWeight: 600,
    cursor: 'pointer', flex: 1,
    boxShadow: '0 2px 12px rgba(59,130,246,0.35)',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  btnDisabled: {
    background: '#1e293b', color: '#475569', cursor: 'not-allowed',
    boxShadow: 'none',
  },
  btnClear: {
    background: 'transparent', color: '#64748b',
    border: '1px solid #334155', borderRadius: '9px',
    padding: '11px 16px', fontSize: '14px', cursor: 'pointer',
    transition: 'border-color 0.15s, color 0.15s',
  },
  statusBar: { display: 'flex', gap: '16px', fontSize: '12px', color: '#475569', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #1e293b' },
  badge: {
    background: 'rgba(30,58,95,0.8)', color: '#60a5fa',
    borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: 700,
    border: '1px solid rgba(59,130,246,0.2)',
  },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', flex: 1, gap: '14px', color: '#475569',
    textAlign: 'center', padding: '60px 20px',
  },
  emptyIcon: { fontSize: '52px', filter: 'drop-shadow(0 0 20px rgba(59,130,246,0.3))' },
  emptyTitle: { fontSize: '20px', fontWeight: 700, color: '#475569' },
  emptyText: { fontSize: '14px', maxWidth: '380px', lineHeight: 1.7, color: '#334155' },
};

export default function App() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [sampleQuestions, setSampleQuestions] = useState([]);

  useEffect(() => {
    getSampleQuestions().then(setSampleQuestions).catch(() => {});
  }, []);

  const handleAsk = async () => {
    if (!question.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await askQuestion(question);
      setResult(data);
      setHistory((h) => [{ question, result: data, ts: new Date() }, ...h.slice(0, 9)]);
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAsk();
  };

  const handleSampleClick = (q) => {
    setQuestion(q);
    setResult(null);
    setError(null);
  };

  const handleHistoryClick = (item) => {
    setQuestion(item.question);
    setResult(item.result);
    setError(null);
  };

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.logoWrap}>
          <span style={styles.logo}>☕</span>
        </div>
        <div>
          <div style={styles.title}>Summit Coffee Co.</div>
          <div style={styles.subtitle}>Supply Chain Analytics Agent</div>
        </div>

        {/* Static nav items */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '32px' }}>
          {[
            { icon: '📊', label: 'Dashboard' },
            { icon: '📦', label: 'Inventory' },
            { icon: '🚚', label: 'Logistics' },
            { icon: '💰', label: 'Finance' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '6px 12px', borderRadius: '7px',
                fontSize: '13px', fontWeight: 500, color: '#64748b',
                cursor: 'default',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.08)'; e.currentTarget.style.color = '#94a3b8'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
            >
              <span style={{ fontSize: '14px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        {/* Right side: status + result badges */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Static status indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '20px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }}></span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#10b981' }}>Agent Online</span>
          </div>

          {/* Static user avatar */}
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0, boxShadow: '0 0 10px rgba(59,130,246,0.3)' }}>
            SC
          </div>

          {result && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', paddingLeft: '12px', borderLeft: '1px solid rgba(51,65,85,0.6)' }}>
              <span style={styles.badge}>{result.tool_name}</span>
              <span style={{ ...styles.badge, background: 'rgba(20,58,40,0.8)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>{result.latency_ms}ms</span>
              <span style={{ ...styles.badge, background: 'rgba(45,27,78,0.8)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}>{result.tokens_used} tokens</span>
            </div>
          )}
        </div>
      </header>

      <div style={styles.main}>
        <aside style={styles.sidebar}>
          <SampleQuestions
            questions={sampleQuestions}
            onSelect={handleSampleClick}
            history={history}
            onHistoryClick={handleHistoryClick}
          />
        </aside>

        <main style={styles.content}>
          <div style={styles.inputCard}>
            <div style={styles.inputLabel}>Ask a supply chain question</div>
            <textarea
              style={styles.textarea}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. What are our top 10 SKUs by gross margin? (Ctrl+Enter to submit)"
              rows={3}
            />
            <div style={styles.btnRow}>
              <button
                style={loading ? { ...styles.btn, ...styles.btnDisabled } : styles.btn}
                onClick={handleAsk}
                disabled={loading || !question.trim()}
              >
                {loading ? '⏳ Analyzing...' : '🔍 Analyze'}
              </button>
              <button style={styles.btnClear} onClick={() => { setQuestion(''); setResult(null); setError(null); }}>
                Clear
              </button>
            </div>
            {result && (
              <div style={styles.statusBar}>
                <span>Tool: <strong style={{ color: '#60a5fa' }}>{result.tool_name}</strong></span>
                <span>Latency: <strong>{result.latency_ms}ms</strong></span>
                <span>Tokens: <strong>{result.tokens_used}</strong></span>
              </div>
            )}
          </div>

          {error && (
            <div style={{ background: 'rgba(69,10,10,0.8)', border: '1px solid rgba(127,29,29,0.8)', borderLeft: '4px solid #ef4444', borderRadius: '10px', padding: '16px 18px', color: '#fca5a5', display: 'flex', alignItems: 'flex-start', gap: '10px', boxShadow: '0 4px 16px rgba(239,68,68,0.1)' }}>
              <span style={{ fontSize: '18px', flexShrink: 0 }}>⚠️</span>
              <span style={{ fontSize: '14px', lineHeight: 1.5 }}>{error}</span>
            </div>
          )}

          {loading && (
            <div style={{ background: 'linear-gradient(145deg, #1e293b, #1a2540)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '14px', padding: '48px 40px', textAlign: 'center', color: '#64748b', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px', animation: 'pulse 1.5s ease-in-out infinite', display: 'inline-block' }}>🤖</div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px' }}>Agent is thinking...</div>
              <div style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={{ color: '#3b82f6' }}>Planning</span>
                <span>→</span>
                <span style={{ color: '#8b5cf6' }}>Executing</span>
                <span>→</span>
                <span style={{ color: '#10b981' }}>Narrating</span>
              </div>
            </div>
          )}

          {result && !loading && <ResultPanel result={result} question={question} />}

          {!result && !loading && !error && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📊</div>
              <div style={styles.emptyTitle}>Ready to analyze</div>
              <div style={styles.emptyText}>
                Ask any supply chain question in plain English. The agent will plan which data sources to use, compute the analysis, and generate insights.
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
