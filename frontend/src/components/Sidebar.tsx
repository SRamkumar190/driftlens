import type {
  ComponentId,
  DeviceComponent,
  SourceMode,
} from '../data/components';
import { componentOrder } from '../data/components';

interface SidebarProps {
  selectedId: ComponentId | null;
  drawerOpen: boolean;
  analysisComplete: boolean;
  analysisCount: number;
  analysisError: string | null;
  isAnalyzing: boolean;
  sourceMode: SourceMode;
  componentData: Record<ComponentId, DeviceComponent>;
  onSelect: (id: ComponentId) => void;
  onRunAnalysis: () => void;
  onRunSlackTest: () => void;
  onSourceModeChange: (mode: SourceMode) => void;
}

export function Sidebar({
  selectedId,
  drawerOpen,
  analysisComplete,
  analysisCount,
  analysisError,
  isAnalyzing,
  sourceMode,
  componentData,
  onSelect,
  onRunAnalysis,
  onRunSlackTest,
  onSourceModeChange,
}: SidebarProps) {
  return (
    <aside className="control-panel" aria-label="Drift analysis controls">
      <header>
        <span className="section-label">Active project</span>
        <h1>Infusion Pump — Revision B</h1>
        <p>DL-2048 · Design review workspace</p>
      </header>

      <div className="analysis-action">
        <button
          className="run-analysis"
          type="button"
          onClick={onRunAnalysis}
          disabled={isAnalyzing}
        >
          <span aria-hidden="true">⌁</span>
          {isAnalyzing
            ? 'Running Drift Analysis…'
            : analysisComplete
              ? 'Re-run Drift Analysis'
              : 'Run Drift Analysis'}
        </button>

        <button
          className="run-slack-test"
          type="button"
          onClick={onRunSlackTest}
          disabled={isAnalyzing}
        >
          Run Slack Test
        </button>

        <fieldset className="source-mode-toggle">
          <legend>Source mode</legend>
          <label>
            <input
              type="radio"
              name="source-mode"
              value="all-sources"
              checked={sourceMode === 'all-sources'}
              onChange={() => onSourceModeChange('all-sources')}
            />
            <span>All Sources</span>
          </label>
        </fieldset>

        {analysisComplete && (
          <p className="analysis-result" role="status">
            {analysisCount} components analyzed
          </p>
        )}
        {analysisError && <p className="analysis-error" role="alert">{analysisError}</p>}
      </div>

      <nav aria-label="Device components">
        <h2>Components</h2>
        <ul>
          {componentOrder.map((id) => {
            const component = componentData[id];
            const visibleStatus = analysisComplete ? component.status : 'unreviewed';
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
                  <i className={`status-dot ${visibleStatus}`} />
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
