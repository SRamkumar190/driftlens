import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EvidencePanel } from './EvidencePanel';
import { Sidebar } from './Sidebar';
import { DeviceViewer } from './DeviceViewer';
import type {
  ComponentId,
  DeviceComponent,
  ReviewStatus,
  SourceMode,
} from '../data/components';
import { components } from '../data/components';
import {
  mapInvestigationComponents,
  type InvestigateApiResponse,
} from '../data/investigation';

const reviewStates = [
  { status: 'approved', label: 'Green', description: 'Matches the reviewed design with complete evidence.' },
  { status: 'warning', label: 'Yellow', description: 'Change is documented, but verification is incomplete.' },
  { status: 'critical', label: 'Red', description: 'Change lacks complete review evidence.' },
  { status: 'unreviewed', label: 'Gray', description: 'There is not enough information to determine status.' },
] as const;

export interface ReviewWorkspaceProps {
  onBack?: () => void;
  requiresUpload?: boolean;
}

type UploadPhase = 'idle' | 'loading' | 'complete';

export function ReviewWorkspace({
  onBack,
  requiresUpload = false,
}: ReviewWorkspaceProps) {
  const [selectedId, setSelectedId] = useState<ComponentId | null>(null);
  const [focusRequestKey, setFocusRequestKey] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sourceMode, setSourceMode] = useState<SourceMode>('all-sources');
  const [componentData, setComponentData] =
    useState<Record<ComponentId, DeviceComponent>>(components);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>(
    requiresUpload ? 'idle' : 'complete',
  );
  const requestKey = useRef(0);

  const componentStatuses = useMemo(
    () => Object.fromEntries(
      Object.entries(componentData).map(([id, component]) => [id, component.status]),
    ) as Record<ComponentId, ReviewStatus>,
    [componentData],
  );

  const selectComponent = (id: ComponentId) => {
    setSelectedId(id);
    setFocusRequestKey((current) => current + 1);
    setDrawerOpen(true);
  };

  const runAnalysis = useCallback(async (mode: SourceMode = sourceMode) => {
    const currentRequest = requestKey.current + 1;
    requestKey.current = currentRequest;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch('/api/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_mode: mode === 'github-only' ? 'github_only' : 'all_sources',
          component_ids: ['controller_01', 'occlusion_sensor_01'],
        }),
      });

      if (!response.ok) {
        throw new Error(`Investigation failed with HTTP ${response.status}`);
      }

      let result = await response.json() as InvestigateApiResponse;
      try {
        const slackBatteryResponse = await fetch('/api/slack-battery');
        if (slackBatteryResponse.ok) {
          const slackBattery = await slackBatteryResponse.json() as {
            component?: InvestigateApiResponse['components'][number];
          };
          if (slackBattery.component) {
            result = {
              ...result,
              components: [...result.components, slackBattery.component],
            };
          }
        }
      } catch {
        // The core investigation remains usable when no live Slack battery result exists.
      }
      const mapped = mapInvestigationComponents(result, mode);
      if (Object.keys(mapped).length === 0) {
        throw new Error('Investigation returned no recognized components');
      }

      if (requestKey.current !== currentRequest) return;
      setComponentData((current) => ({ ...current, ...mapped }));
      setAnalysisCount(Object.keys(mapped).length);
      setAnalysisComplete(true);
    } catch (error) {
      if (requestKey.current !== currentRequest) return;
      setAnalysisError(error instanceof Error ? error.message : 'Investigation failed');
    } finally {
      if (requestKey.current === currentRequest) setIsAnalyzing(false);
    }
  }, [sourceMode]);

  const runSlackTest = useCallback(async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch('/api/slack-battery');
      if (!response.ok) {
        throw new Error('No Battery Module message found in HydraDB Slack yet');
      }

      const payload = await response.json() as {
        component?: InvestigateApiResponse['components'][number];
      };
      if (!payload.component) {
        throw new Error('HydraDB returned no Battery Module result');
      }

      const mapped = mapInvestigationComponents({
        investigation_id: 'slack-test',
        review_status: 'pending',
        response_source: 'rocketride',
        components: [payload.component],
      }, 'all-sources');
      setComponentData((current) => ({ ...current, ...mapped }));
      setAnalysisCount(1);
      setAnalysisComplete(true);
      setSelectedId('battery-module');
      setFocusRequestKey((current) => current + 1);
      setDrawerOpen(true);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Slack test failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const changeSourceMode = (mode: SourceMode) => {
    setSourceMode(mode);
    setDrawerOpen(false);
    if (analysisComplete) void runAnalysis(mode);
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

  useEffect(() => {
    if (uploadPhase !== 'loading') return;

    const revealTimer = window.setTimeout(() => {
      setUploadPhase('complete');
    }, 5000);

    return () => window.clearTimeout(revealTimer);
  }, [uploadPhase]);

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

      {uploadPhase !== 'complete' && (
        <section className={`upload-stage is-${uploadPhase}`} aria-live="polite">
          {uploadPhase === 'idle' ? (
            <>
              <div className="upload-stage__icon" aria-hidden="true">
                <svg viewBox="0 0 64 64" focusable="false">
                  <path d="M32 42V13" />
                  <path d="m20 25 12-12 12 12" />
                  <path d="M14 38v10a5 5 0 0 0 5 5h26a5 5 0 0 0 5-5V38" />
                </svg>
              </div>
              <p className="eyebrow">Start a design review</p>
              <h2>Upload your device package</h2>
              <p>
                Add the current design package to prepare the assembly and connect its
                evidence trail.
              </p>
              <button
                className="upload-stage__button"
                type="button"
                onClick={() => setUploadPhase('loading')}
              >
                <span>Upload device file</span>
                <small>GLB, STEP, OBJ or ZIP</small>
              </button>
            </>
          ) : (
            <>
              <div className="gold-loader" role="status" aria-label="Preparing 3D model">
                <span className="gold-loader__orbit" />
                <span className="gold-loader__orbit is-secondary" />
                <span className="gold-loader__core">DL</span>
              </div>
              <p className="eyebrow">Building review workspace</p>
              <h2>Preparing your 3D model</h2>
              <p>Mapping components and connecting design evidence. This takes about 5 seconds.</p>
              <div className="upload-stage__progress" aria-hidden="true"><span /></div>
            </>
          )}
        </section>
      )}

      <div
        className={`review-grid ${uploadPhase === 'complete' ? 'workspace-reveal' : ''}`}
        hidden={uploadPhase !== 'complete'}
      >
        <div className="device-column">
          <Sidebar
            selectedId={selectedId}
            drawerOpen={drawerOpen}
            analysisComplete={analysisComplete}
            analysisCount={analysisCount}
            analysisError={analysisError}
            isAnalyzing={isAnalyzing}
            sourceMode={sourceMode}
            componentData={componentData}
            onSelect={selectComponent}
            onRunAnalysis={() => void runAnalysis()}
            onRunSlackTest={() => void runSlackTest()}
            onSourceModeChange={changeSourceMode}
          />

          <section className="workspace-viewport" aria-label="Device viewer">
            <header className="viewport-header">
              <div>
                <p className="eyebrow">Interactive digital assembly</p>
                <h2>Medical Device View</h2>
              </div>
              <span className={`analysis-state ${analysisComplete ? 'is-complete' : ''}`}>
                <i />
                {isAnalyzing
                  ? 'Analyzing live sources'
                  : analysisComplete
                    ? 'Analysis complete'
                    : 'Ready to analyze'}
              </span>
            </header>
            <div className="viewport-canvas">
              <DeviceViewer
                selectedId={selectedId}
                focusRequestKey={focusRequestKey}
                onSelect={selectComponent}
                analysisComplete={analysisComplete}
                componentStatuses={componentStatuses}
              />
              <div className="viewer-hint">Click a part to investigate · Drag to orbit · Scroll to zoom</div>
              {drawerOpen && selectedId && (
                <aside
                  className="evidence-drawer"
                  id="component-evidence"
                  aria-label="Selected component evidence"
                >
                  <EvidencePanel
                    component={componentData[selectedId]}
                    onClose={() => setDrawerOpen(false)}
                  />
                </aside>
              )}
            </div>
          </section>
        </div>
      </div>

      <section
        className={`review-states-card ${uploadPhase === 'complete' ? 'workspace-reveal' : ''}`}
        aria-labelledby="review-states-title"
        hidden={uploadPhase !== 'complete'}
      >
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
