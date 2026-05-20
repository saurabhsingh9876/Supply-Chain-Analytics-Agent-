import React, { useState, useEffect } from 'react';
import { askQuestion, getSampleQuestions } from './api';
import ResultPanel from './components/ResultPanel/ResultPanel';
import SampleQuestions from './components/SampleQuestions/SampleQuestions';
import AgentLoader from './components/AgentLoader/AgentLoader';
import HeaderTicker from './components/HeaderTicker/HeaderTicker';
import './App.css';
import './animations.css';

const ROLES = [
  { value: 'executive', label: '👑 Executive', color: '#f59e0b', desc: 'Full access to all 6 data sources' },
  { value: 'analyst',   label: '📊 Analyst',   color: '#60a5fa', desc: 'No customer or pricing data' },
  { value: 'viewer',    label: '👁 Viewer',     color: '#94a3b8', desc: 'Transactions & budget only' },
];

const RATING_COLORS = {
  excellent: '#4ade80',
  moderate:  '#60a5fa',
  average:   '#f59e0b',
  worst:     '#f87171',
};

export default function App() {
  const [question, setQuestion]         = useState('');
  const [role, setRole]                 = useState('executive');
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState(null);
  const [error, setError]               = useState(null);
  const [history, setHistory]           = useState([]);
  const [sampleQuestions, setSampleQuestions] = useState([]);
  const [sessionCache, setSessionCache] = useState([]);
  const [currentRating, setCurrentRating] = useState(null);

  useEffect(() => {
    getSampleQuestions().then(setSampleQuestions).catch(() => {});
  }, []);

  const currentRole = ROLES.find(r => r.value === role) || ROLES[0];

  const handleAsk = async () => {
    if (!question.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCurrentRating(null);
    try {
      const context = sessionCache.slice(-5);
      const data = await askQuestion(question, role, context);
      setResult(data);
      setHistory(h => [{ question, result: data, ts: new Date() }, ...h.slice(0, 9)]);
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRate = (rating) => {
    if (!result || !question) return;
    setCurrentRating(rating);
    const entry = { question, summary: result.summary, rating, ts: new Date().toISOString() };
    setSessionCache(prev => [...prev.slice(-9), entry]);
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAsk();
  };

  const handleSampleClick = q => { setQuestion(q); setResult(null); setError(null); };
  const handleHistoryClick = item => { setQuestion(item.question); setResult(item.result); setError(null); };

  const handleClear = () => {
    setQuestion(''); setResult(null); setError(null); setCurrentRating(null);
  };

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="app-icon" title="Supply Chain Analytics Agent">☕</div>
        <div>
          <div className="app-header__title">Summit Coffee Co.</div>
          <div className="app-header__subtitle">Supply Chain Analytics Agent</div>
        </div>
        <HeaderTicker />
        <div className="app-header__right">
          {/* <span className="status-dot" /> */}
          {/* <span className="status-text">Live</span> */}
          <select
            className="role-selector"
            style={{ borderColor: currentRole.color }}
            value={role}
            onChange={e => { setRole(e.target.value); setResult(null); setError(null); }}
          >
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      </header>

      {/* ── Main layout ── */}
      <div className="app-main">
        <aside className="app-sidebar">
          <SampleQuestions
            questions={sampleQuestions}
            onSelect={handleSampleClick}
            history={history}
            onHistoryClick={handleHistoryClick}
          />
        </aside>

        <main className="app-content">
          {/* Input card */}
          <div className="input-card">
            <div className="input-label">Ask a supply chain question</div>
            <textarea
              className="input-textarea"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. What are our top 10 SKUs by gross margin? (Ctrl+Enter to submit)"
              rows={3}
            />
            <div className="btn-row">
              <button
                className="btn-analyze"
                onClick={handleAsk}
                disabled={loading || !question.trim()}
              >
                {loading ? 'Analyzing…' : 'Analyze'}
              </button>
              <button className="btn-clear" onClick={handleClear}>Clear</button>
            </div>
            {result && (
              <div className="status-bar">
                <span>Tool: <strong style={{ color: '#60a5fa' }}>{result.tool_name}</strong></span>
                <span>Latency: <strong>{result.latency_ms}ms</strong></span>
                <span>Tokens: <strong>{result.tokens_used}</strong></span>
              </div>
            )}
          </div>

          {/* Role info bar */}
          <div className="role-bar" style={{ color: currentRole.color }}>
            <span style={{ fontWeight: 700 }}>{currentRole.label}</span>
            <span style={{ color: '#475569' }}>—</span>
            <span style={{ color: '#64748b' }}>{currentRole.desc}</span>
          </div>

          {/* Error */}
          {error && <div className="error-box">{error}</div>}

          {/* RBAC denied */}
          {result && result.error === 'rbac_denied' && (
            <div className="denied-box">
              🔒 <strong>Access Denied</strong> — {result.summary}
            </div>
          )}

          {/* Animated loader */}
          {loading && <AgentLoader />}

          {/* Result */}
          {result && !loading && (
            <ResultPanel
              result={result}
              question={question}
              onRate={handleRate}
              currentRating={currentRating}
            />
          )}

          {/* Session memory bar */}
          {sessionCache.length > 0 && (
            <div className="session-bar">
              <span>📚 Session memory:</span>
              {sessionCache.slice(-5).map((entry, i) => (
                <span
                  key={i}
                  className="session-badge"
                  style={{ borderColor: RATING_COLORS[entry.rating] || '#334155', color: RATING_COLORS[entry.rating] || '#64748b' }}
                >
                  {entry.rating}
                </span>
              ))}
              <span style={{ color: '#334155' }}>— Claude uses these to improve next answer</span>
            </div>
          )}

          {/* Empty state */}
          {!result && !loading && !error && (
            <div className="empty-state">
              <div className="empty-state__title">Ready to analyze</div>
              <div className="empty-state__text">
                Ask any supply chain question in plain English. The agent will plan which data sources to use, compute the analysis, and generate insights.
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
