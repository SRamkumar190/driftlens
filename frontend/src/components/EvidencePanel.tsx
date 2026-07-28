import type { DeviceComponent } from '../data/components';

interface EvidencePanelProps {
  component: DeviceComponent;
  onClose: () => void;
}

export function EvidencePanel({ component, onClose }: EvidencePanelProps) {
  const sourceLabel = (source: string) => source === 'Drive' ? 'Google Drive' : source;
  const statusLabel = {
    critical: 'Red · Review gap',
    warning: 'Yellow · Verify',
    approved: 'Green · Matched',
    unreviewed: 'Gray · Insufficient',
  }[component.status];
  const hasEvidence = (summary: string) => !/^no\b/i.test(summary);

  return (
    <div className="evidence-panel">
      <section className="evidence-card component-summary">
        <header>
          <div>
            <p className="eyebrow">Selected component</p>
            <h2>{component.name}</h2>
          </div>
          <div className="component-summary__actions">
            <span className={`status-badge ${component.status}`}>{statusLabel}</span>
            <button
              className="evidence-close"
              type="button"
              aria-label="Close component evidence"
              onClick={onClose}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </header>

        <dl className="value-grid">
          <div>
            <dt>Reviewed value</dt>
            <dd>{component.approvedValue}</dd>
          </div>
          <div>
            <dt>Current value</dt>
            <dd>{component.currentValue}</dd>
          </div>
          <div>
            <dt>Confidence</dt>
            <dd>{component.confidence}%</dd>
          </div>
        </dl>

        <section className="conclusion-card" aria-labelledby="conclusion-heading">
          <h3 id="conclusion-heading">Agent conclusion</h3>
          <p>{component.conclusion}</p>
        </section>
      </section>

      <section className="evidence-card evidence-section" aria-labelledby="evidence-heading">
          <h3 id="evidence-heading">Evidence checklist</h3>
          <ul>
            {component.evidence.map((item) => {
              const found = hasEvidence(item.summary);
              return (
                <li key={`${item.source}-${item.reference}`}>
                  <span className={`source-icon source-${item.source.toLowerCase()}`}>{item.source.slice(0, 1)}</span>
                  <div>
                    <strong>{sourceLabel(item.source)}</strong>
                    <p>{item.summary}</p>
                  </div>
                  <span className={`evidence-result ${found ? 'found' : 'missing'}`} aria-label={found ? 'Evidence found' : 'Evidence missing'}>
                    {found ? '✓' : '×'}
                  </span>
                </li>
              );
            })}
          </ul>
      </section>

      <section className="evidence-card recommendation" aria-labelledby="recommendation-heading">
          <h3 id="recommendation-heading">Recommended action</h3>
          <p>{component.recommendation}</p>
          <button type="button">Draft Review Task <span>↗</span></button>
      </section>
    </div>
  );
}
