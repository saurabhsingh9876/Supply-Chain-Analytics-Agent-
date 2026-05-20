import React, { useState, useEffect } from 'react';
import '../../animations.css';
import './AgentLoader.css';

const STAGES = [
  {
    id: 'plan',
    icon: '🧠',
    label: 'Planning',
    duration: 4000,
    messages: [
      'Reading your question...',
      'Identifying relevant data sources...',
      'Selecting the right analytics tool...',
      'Almost ready to execute...',
    ],
  },
  {
    id: 'execute',
    icon: '⚙️',
    label: 'Executing',
    duration: 5000,
    messages: [
      'Generating pandas code...',
      'Running query against supply chain data...',
      'Aggregating results...',
      'Almost there...',
    ],
  },
  {
    id: 'narrate',
    icon: '✍️',
    label: 'Narrating',
    duration: 6000,
    messages: [
      'Analysing the numbers...',
      'Crafting insights...',
      'Adding recommendations...',
      'Finalising your answer...',
    ],
  },
];

function TypingDots() {
  return (
    <span className="typing-dots">
      <span /><span /><span />
    </span>
  );
}

export default function AgentLoader() {
  const [stageIdx, setStageIdx] = useState(0);
  const [msgIdx, setMsgIdx]     = useState(0);

  // Rotate sub-messages every 1.4 s within the current stage
  useEffect(() => {
    const msgs = STAGES[stageIdx].messages;
    const t = setInterval(() => {
      setMsgIdx(i => (i + 1) % msgs.length);
    }, 1400);
    return () => clearInterval(t);
  }, [stageIdx]);

  // Advance to next stage after each stage's duration
  useEffect(() => {
    if (stageIdx >= STAGES.length - 1) return;
    const t = setTimeout(() => {
      setStageIdx(i => i + 1);
      setMsgIdx(0);
    }, STAGES[stageIdx].duration);
    return () => clearTimeout(t);
  }, [stageIdx]);

  return (
    <div className="loading-box">
      <div className="loading-header">
        <div className="loading-spinner" />
        <span className="loading-title">Agent is thinking…</span>
      </div>

      <div className="stage-list">
        {STAGES.map((stage, idx) => {
          const status =
            idx < stageIdx   ? 'done'    :
            idx === stageIdx ? 'active'  :
                               'waiting';

          return (
            <div key={stage.id} className={`stage-item stage-item--${status}`}>
              {status === 'done' ? (
                <div className="stage-check">✓</div>
              ) : (
                <span className="stage-icon">{stage.icon}</span>
              )}

              <div className="stage-body">
                <div className="stage-label">{stage.label}</div>

                {status === 'active' && (
                  <>
                    <div className="stage-subtext">
                      {stage.messages[msgIdx]}&nbsp;<TypingDots />
                    </div>
                    <div className="stage-progress">
                      <div
                        className="stage-progress__fill"
                        style={{ animationDuration: `${stage.duration}ms` }}
                      />
                    </div>
                  </>
                )}

                {status === 'done' && (
                  <div className="stage-subtext">Complete</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
