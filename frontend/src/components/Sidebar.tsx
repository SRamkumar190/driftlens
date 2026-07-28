import type { ComponentId } from '../data/components';
import { componentOrder, components } from '../data/components';

interface SidebarProps {
  selectedId: ComponentId | null;
  drawerOpen: boolean;
  analysisComplete: boolean;
  onSelect: (id: ComponentId) => void;
  onRunAnalysis: () => void;
}

export function Sidebar({
  selectedId,
  drawerOpen,
  analysisComplete,
  onSelect,
  onRunAnalysis,
}: SidebarProps) {
  return (
    <aside className="control-panel" aria-label="Drift analysis controls">
      <header>
        <span className="section-label">Active project</span>
        <h1>Infusion Pump — Revision B</h1>
        <p>DL-2048 · Design review workspace</p>
      </header>

      <div className="analysis-action">
        <button className="run-analysis" type="button" onClick={onRunAnalysis}>
          <span aria-hidden="true">⌁</span>
          {analysisComplete ? 'Re-run Drift Analysis' : 'Run Drift Analysis'}
        </button>
        {analysisComplete && <p className="analysis-result" role="status">5 components analyzed</p>}
      </div>

      <nav aria-label="Device components">
        <h2>Components</h2>
        <ul>
          {componentOrder.map((id) => {
            const component = components[id];
            return (
              <li key={id}>
                <button
                  type="button"
                  aria-pressed={selectedId === id}
                  aria-expanded={selectedId === id && drawerOpen}
                  aria-controls="component-evidence"
                  data-component-id={id}
                  onClick={() => onSelect(id)}
                >
                  <i className={`status-dot ${component.status}`} />
                  <span>{component.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
