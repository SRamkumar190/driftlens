import { useEffect, useState } from 'react';
import { EvidencePanel } from './EvidencePanel';
import { Sidebar } from './Sidebar';
import { DeviceViewer } from './DeviceViewer';
import type { ComponentId } from '../data/components';
import { components } from '../data/components';

const reviewStates = [
  { status: 'approved', label: 'Green', description: 'Matches the reviewed design with complete evidence.' },
  { status: 'warning', label: 'Yellow', description: 'Change is documented, but verification is incomplete.' },
  { status: 'critical', label: 'Red', description: 'Change lacks complete review evidence.' },
  { status: 'unreviewed', label: 'Gray', description: 'There is not enough information to determine status.' },
] as const;

export interface ReviewWorkspaceProps {
  onBack?: () => void;
}

export function ReviewWorkspace({ onBack }: ReviewWorkspaceProps) {
  const [selectedId, setSelectedId] = useState<ComponentId | null>(null);
  const [focusRequestKey, setFocusRequestKey] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const selectComponent = (id: ComponentId) => {
    setSelectedId(id);
    setFocusRequestKey((current) => current + 1);
    setDrawerOpen(true);
  };

  useEffect(() => {
    if (!drawerOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [drawerOpen]);

  useEffect(() => {
    if (drawerOpen || !selectedId) return;
    document
      .querySelector<HTMLButtonElement>(`[data-component-id="${selectedId}"]`)
      ?.focus();
  }, [drawerOpen, selectedId]);

  return (
    <main className="driftlens-workspace">
      <header className="app-masthead">
        {onBack && (
          <button className="overview-link" type="button" onClick={onBack}>
            ← Back to overview
          </button>
        )}
        <div className="masthead-mark" aria-hidden="true">
          <svg viewBox="0 0 64 64" focusable="false">
            <path d="M14 28.5C18.7 20.8 25 17 33 17s14.3 3.8 19 11.5C47.3 36.2 41 40 33 40s-14.3-3.8-19-11.5Z" />
            <circle cx="33" cy="28.5" r="6.5" />
            <path d="m43 39 9 9" />
          </svg>
        </div>
        <div>
          <h1>DriftLens</h1>
          <p>Find what changed in a medical device, and see whether the team can explain it.</p>
        </div>
      </header>

      <div className="review-grid">
        <div className="device-column">
          <Sidebar
            selectedId={selectedId}
            drawerOpen={drawerOpen}
            analysisComplete={analysisComplete}
            onSelect={selectComponent}
            onRunAnalysis={() => setAnalysisComplete(true)}
          />

          <section className="workspace-viewport" aria-label="Device viewer">
            <header className="viewport-header">
              <div>
                <p className="eyebrow">Interactive digital assembly</p>
                <h2>Medical Device View</h2>
              </div>
              <span className={`analysis-state ${analysisComplete ? 'is-complete' : ''}`}>
                <i />
                {analysisComplete ? 'Analysis complete' : 'Ready to analyze'}
              </span>
            </header>
            <div className="viewport-canvas">
              <DeviceViewer
                selectedId={selectedId}
                focusRequestKey={focusRequestKey}
                onSelect={selectComponent}
                analysisComplete={analysisComplete}
              />
              <div className="viewer-hint">Click a part to investigate · Drag to orbit · Scroll to zoom</div>
              {drawerOpen && selectedId && (
                <aside
                  className="evidence-drawer"
                  id="component-evidence"
                  aria-label="Selected component evidence"
                >
                  <EvidencePanel
                    component={components[selectedId]}
                    onClose={() => setDrawerOpen(false)}
                  />
                </aside>
              )}
            </div>
          </section>
        </div>
      </div>

      <section className="review-states-card" aria-labelledby="review-states-title">
        <h2 id="review-states-title">Review states</h2>
        <div className="review-state-grid">
          {reviewStates.map((state) => (
            <article className={`review-state ${state.status}`} key={state.status}>
              <i className={`status-orb ${state.status}`} />
              <div>
                <strong>{state.label}</strong>
                <p>{state.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
