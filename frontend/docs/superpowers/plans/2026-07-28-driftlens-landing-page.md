# DriftLens Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a judge-focused DriftLens landing page at `/` that explains the cross-system evidence value and launches the existing review workspace at `/review`.

**Architecture:** Extract the current `App` body into a focused `ReviewWorkspace` component, then make `App` a dependency-free route shell driven by `window.location.pathname` and the History API. Build `LandingPage` as a separate presentational component that reuses the real `DeviceViewer` for the product proof composition and receives navigation callbacks from `App`.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, React Three Fiber, Drei, CSS.

## Global Constraints

- Preserve the existing `DeviceViewer`, `Sidebar`, `EvidencePanel`, local data contracts, GLB loading logic, and GitHub-only evidence behavior.
- Keep the GLB’s authored materials; do not reintroduce frontend status coloring.
- Use `/` for the landing page and `/review` for the review workspace.
- Do not add a router dependency.
- Use the headline “Know what changed. Prove why.”
- Present DriftLens as helping engineering and quality teams do their best work through shared context and confident review.
- Show the complete-context `96%` to GitHub-only `19%` confidence story.
- Avoid gradients, glassmorphism, generic AI imagery, excessive animation, and unrelated marketing sections.
- Do not add authentication, persistence, analytics, pricing, testimonials, signup forms, admin features, notifications, or new product workflows.

---

## File Structure

- Create `src/components/ReviewWorkspace.tsx`: owns the existing analysis, component-selection, source-mode, evidence, legend, and workflow UI.
- Create `src/components/ReviewWorkspace.test.tsx`: preserves the existing review-workspace behavior tests.
- Create `src/components/LandingPage.tsx`: renders the judge-facing landing page and consumes `onLaunchDemo: () => void`.
- Create `src/components/LandingPage.test.tsx`: verifies the landing copy, evidence-confidence story, and CTA callback.
- Modify `src/App.tsx`: becomes the lightweight pathname router and passes navigation callbacks.
- Modify `src/App.test.tsx`: verifies `/`, `/review`, launch navigation, back navigation, and unknown-path fallback.
- Modify `src/styles.css`: adds landing-page styles and a small workspace back-link style without changing the 3D viewer behavior.

---

### Task 1: Extract the existing review workspace

**Files:**
- Create: `src/components/ReviewWorkspace.tsx`
- Create: `src/components/ReviewWorkspace.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `Sidebar`, `DeviceViewer`, `EvidencePanel`, `components`, `ComponentId`, and `SourceMode`.
- Produces: `export interface ReviewWorkspaceProps { onBack?: () => void }` and `export function ReviewWorkspace({ onBack }: ReviewWorkspaceProps): JSX.Element`.

- [ ] **Step 1: Write the failing extraction test**

Create `src/components/ReviewWorkspace.test.tsx` with the existing workspace assertions against the wished-for component:

```tsx
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { githubOnlyConclusion } from '../data/components';
import { ReviewWorkspace } from './ReviewWorkspace';

describe('ReviewWorkspace', () => {
  afterEach(cleanup);

  it('renders the complete medical-device review workspace', () => {
    render(<ReviewWorkspace />);

    expect(screen.getByRole('heading', { name: 'Medical Device View' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Review states' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'How DriftLens works' })).toBeTruthy();
  });

  it('selects Occlusion Sensor and updates the evidence panel', () => {
    render(<ReviewWorkspace />);

    const componentNav = screen.getByRole('navigation', { name: /device components/i });
    fireEvent.click(within(componentNav).getByRole('button', { name: /occlusion sensor/i }));

    expect(screen.getByRole('heading', { name: 'Occlusion Sensor' })).toBeTruthy();
  });

  it('runs the analysis and reports completion', () => {
    render(<ReviewWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: /run drift analysis/i }));
    expect(screen.getByRole('status').textContent).toMatch(/components analyzed/i);
  });

  it('degrades to GitHub-only evidence', () => {
    render(<ReviewWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: /github only/i }));

    expect(screen.getByText('19%')).toBeTruthy();
    expect(screen.getByText(githubOnlyConclusion)).toBeTruthy();
    expect(screen.queryByText('Google Drive')).toBeNull();
    expect(screen.queryByText('Slack')).toBeNull();
    expect(screen.queryByText('Linear')).toBeNull();
    expect(screen.getByText('GitHub')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the extraction test and verify RED**

Run:

```powershell
npm.cmd test -- --run src/components/ReviewWorkspace.test.tsx
```

Expected: FAIL because `./ReviewWorkspace` does not exist.

- [ ] **Step 3: Move the current workspace into `ReviewWorkspace`**

Create `src/components/ReviewWorkspace.tsx` by moving the current `reviewStates`, `workflowSteps`, state, `runAnalysis`, and JSX from `App.tsx`. Add an optional overview action at the beginning of the masthead:

```tsx
import { useState } from 'react';
import { EvidencePanel } from './EvidencePanel';
import { Sidebar } from './Sidebar';
import { DeviceViewer } from './DeviceViewer';
import type { ComponentId, SourceMode } from '../data/components';
import { components } from '../data/components';

const reviewStates = [
  { status: 'approved', label: 'Green', description: 'Matches the reviewed design with complete evidence.' },
  { status: 'warning', label: 'Yellow', description: 'Change is documented, but verification is incomplete.' },
  { status: 'critical', label: 'Red', description: 'Change lacks complete review evidence.' },
  { status: 'unreviewed', label: 'Gray', description: 'There is not enough information to determine status.' },
] as const;

const workflowSteps = [
  { icon: 'D', title: 'Review design', detail: 'Read the approved specification' },
  { icon: 'S', title: 'Check discussions', detail: 'Find engineering rationale' },
  { icon: 'L', title: 'Check review tasks', detail: 'Confirm change assessment' },
  { icon: 'G', title: 'Inspect current code', detail: 'Resolve implemented values' },
  { icon: '∆', title: 'Explain the drift', detail: 'Show what evidence is missing' },
] as const;

export interface ReviewWorkspaceProps {
  onBack?: () => void;
}

export function ReviewWorkspace({ onBack }: ReviewWorkspaceProps) {
  const [selectedId, setSelectedId] = useState<ComponentId>('main-controller');
  const [sourceMode, setSourceMode] = useState<SourceMode>('all-sources');
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const runAnalysis = () => {
    setAnalysisComplete(true);
    setSelectedId('main-controller');
  };

  return (
    <main className="driftlens-workspace">
      <header className="app-masthead">
        {onBack && (
          <button className="overview-link" type="button" onClick={onBack}>
            ← Back to overview
          </button>
        )}
        <div className="masthead-mark" aria-hidden="true"><span>⌁</span></div>
        <div>
          <h1>DriftLens</h1>
          <p>Find what changed in a medical device, and see whether the team can explain it.</p>
        </div>
      </header>

      <div className="review-grid">
        <div className="device-column">
          <Sidebar
            selectedId={selectedId}
            sourceMode={sourceMode}
            analysisComplete={analysisComplete}
            onSelect={setSelectedId}
            onSourceModeChange={setSourceMode}
            onRunAnalysis={runAnalysis}
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
              <DeviceViewer selectedId={selectedId} onSelect={setSelectedId} analysisComplete={analysisComplete} />
              <div className="viewer-hint">Click a part to investigate · Drag to orbit · Scroll to zoom</div>
            </div>
          </section>
        </div>
        <EvidencePanel component={components[selectedId]} sourceMode={sourceMode} />
      </div>

      <section className="review-states-card" aria-labelledby="review-states-title">
        <h2 id="review-states-title">Review states</h2>
        <div className="review-state-grid">
          {reviewStates.map((state) => (
            <article className={`review-state ${state.status}`} key={state.status}>
              <i className={`status-orb ${state.status}`} />
              <div><strong>{state.label}</strong><p>{state.description}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="workflow-card" aria-labelledby="workflow-title">
        <h2 id="workflow-title">How DriftLens works</h2>
        <div className="workflow-steps">
          {workflowSteps.map((step, index) => (
            <div className="workflow-step" key={step.title}>
              <span className="workflow-icon">{step.icon}</span>
              <div><strong>{index + 1}. {step.title}</strong><p>{step.detail}</p></div>
              {index < workflowSteps.length - 1 && <span className="workflow-arrow" aria-hidden="true">→</span>}
            </div>
          ))}
        </div>
        <p className="workflow-summary">Click a part <span>→</span> See what changed <span>→</span> See why it matters</p>
      </section>
    </main>
  );
}
```

Replace `App.tsx` temporarily with:

```tsx
import { ReviewWorkspace } from './components/ReviewWorkspace';

export default function App() {
  return <ReviewWorkspace />;
}
```

- [ ] **Step 4: Keep only route-level coverage in `App.test.tsx`**

Replace the existing workspace tests in `src/App.test.tsx` with one temporary smoke test:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  afterEach(cleanup);

  it('renders the review workspace before routing is added', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Medical Device View' })).toBeTruthy();
  });
});
```

- [ ] **Step 5: Run the focused and full tests and verify GREEN**

Run:

```powershell
npm.cmd test -- --run src/components/ReviewWorkspace.test.tsx src/App.test.tsx
npm.cmd test -- --run
```

Expected: the focused extraction tests pass, followed by the full suite passing.

- [ ] **Step 6: Commit the extraction**

```powershell
git add driftlens/src/App.tsx driftlens/src/App.test.tsx driftlens/src/components/ReviewWorkspace.tsx driftlens/src/components/ReviewWorkspace.test.tsx
git commit -m "refactor: extract DriftLens review workspace"
```

---

### Task 2: Add the lightweight route shell and landing-page contract

**Files:**
- Create: `src/components/LandingPage.tsx`
- Create: `src/components/LandingPage.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `ReviewWorkspace({ onBack })`.
- Produces: `export interface LandingPageProps { onLaunchDemo: () => void }`, `export function LandingPage({ onLaunchDemo }: LandingPageProps): JSX.Element`, and route navigation that recognizes only `/review` as the workspace.

- [ ] **Step 1: Write failing landing-page component tests**

Create `src/components/LandingPage.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LandingPage } from './LandingPage';

describe('LandingPage', () => {
  afterEach(cleanup);

  it('introduces the product to hackathon judges', () => {
    render(<LandingPage onLaunchDemo={() => undefined} />);

    expect(screen.getByRole('heading', { name: 'Know what changed. Prove why.' })).toBeTruthy();
    expect(screen.getByText(/teams do their best work/i)).toBeTruthy();
  });

  it('launches the interactive demo', () => {
    const onLaunchDemo = vi.fn();
    render(<LandingPage onLaunchDemo={onLaunchDemo} />);

    fireEvent.click(screen.getByRole('button', { name: 'Launch Demo' }));
    expect(onLaunchDemo).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the landing-page tests and verify RED**

Run:

```powershell
npm.cmd test -- --run src/components/LandingPage.test.tsx
```

Expected: FAIL because `./LandingPage` does not exist.

- [ ] **Step 3: Create the minimal landing-page contract**

Create `src/components/LandingPage.tsx`:

```tsx
export interface LandingPageProps {
  onLaunchDemo: () => void;
}

export function LandingPage({ onLaunchDemo }: LandingPageProps) {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <a className="landing-brand" href="/" aria-label="DriftLens home">DriftLens</a>
        <button className="landing-launch" type="button" onClick={onLaunchDemo}>
          Launch Demo
        </button>
      </header>
      <section className="landing-hero">
        <p className="eyebrow">Medical-device design drift review</p>
        <h1>Know what changed. Prove why.</h1>
        <p>
          Give engineering and quality teams the shared evidence they need to do their best work.
        </p>
        <button type="button" onClick={onLaunchDemo}>Launch Demo</button>
      </section>
    </main>
  );
}
```

The navigation and hero each use `Launch Demo`; update the test to use `screen.getAllByRole('button', { name: 'Launch Demo' })`, assert length `2`, click the second button, and assert one callback.

- [ ] **Step 4: Write failing route-level tests**

Replace `src/App.test.tsx` with:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';

describe('App routing', () => {
  beforeEach(() => window.history.replaceState({}, '', '/'));
  afterEach(cleanup);

  it('renders the landing page at the root path', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Know what changed. Prove why.' })).toBeTruthy();
  });

  it('launches the review workspace without a reload', () => {
    render(<App />);
    const launchButtons = screen.getAllByRole('button', { name: 'Launch Demo' });
    fireEvent.click(launchButtons[1]);

    expect(window.location.pathname).toBe('/review');
    expect(screen.getByRole('heading', { name: 'Medical Device View' })).toBeTruthy();
  });

  it('supports direct review-workspace navigation', () => {
    window.history.replaceState({}, '', '/review');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Medical Device View' })).toBeTruthy();
  });

  it('returns from the workspace to the overview', () => {
    window.history.replaceState({}, '', '/review');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Back to overview' }));

    expect(window.location.pathname).toBe('/');
    expect(screen.getByRole('heading', { name: 'Know what changed. Prove why.' })).toBeTruthy();
  });

  it('falls back to the landing page for unknown paths', () => {
    window.history.replaceState({}, '', '/unknown');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Know what changed. Prove why.' })).toBeTruthy();
  });
});
```

- [ ] **Step 5: Run the route tests and verify RED**

Run:

```powershell
npm.cmd test -- --run src/App.test.tsx
```

Expected: FAIL because `App` still always renders `ReviewWorkspace`.

- [ ] **Step 6: Implement History API routing**

Replace `src/App.tsx` with:

```tsx
import { useCallback, useEffect, useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { ReviewWorkspace } from './components/ReviewWorkspace';

const currentRoute = () => window.location.pathname === '/review' ? '/review' : '/';

export default function App() {
  const [route, setRoute] = useState(currentRoute);

  useEffect(() => {
    const syncRoute = () => setRoute(currentRoute());
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  const navigate = useCallback((nextRoute: '/' | '/review') => {
    window.history.pushState({}, '', nextRoute);
    setRoute(nextRoute);
    window.scrollTo({ top: 0 });
  }, []);

  return route === '/review'
    ? <ReviewWorkspace onBack={() => navigate('/')} />
    : <LandingPage onLaunchDemo={() => navigate('/review')} />;
}
```

Guard the `window.scrollTo` call so jsdom does not report an unimplemented API:

```tsx
if (typeof window.scrollTo === 'function' && !navigator.userAgent.includes('jsdom')) {
  window.scrollTo({ top: 0 });
}
```

- [ ] **Step 7: Run the focused and full tests and verify GREEN**

Run:

```powershell
npm.cmd test -- --run src/components/LandingPage.test.tsx src/App.test.tsx
npm.cmd test -- --run
```

Expected: routing, landing-page contract, and all existing workspace tests pass.

- [ ] **Step 8: Commit route and landing contract**

```powershell
git add driftlens/src/App.tsx driftlens/src/App.test.tsx driftlens/src/components/LandingPage.tsx driftlens/src/components/LandingPage.test.tsx
git commit -m "feat: add DriftLens landing route"
```

---

### Task 3: Build the judge-facing product story and visual system

**Files:**
- Modify: `src/components/LandingPage.tsx`
- Modify: `src/components/LandingPage.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `DeviceViewerProps` with `selectedId="main-controller"`, `analysisComplete={false}`, and a no-op `onSelect`.
- Produces: hero, product proof, three capability cards, `#demo-flow`, and footer while preserving `LandingPageProps`.

- [ ] **Step 1: Add failing tests for the complete product story**

Extend `src/components/LandingPage.test.tsx`:

```tsx
it('demonstrates why cross-system context matters', () => {
  render(<LandingPage onLaunchDemo={() => undefined} />);

  expect(screen.getByRole('heading', { name: 'One change. Two very different answers.' })).toBeTruthy();
  expect(screen.getByText('96%')).toBeTruthy();
  expect(screen.getByText('19%')).toBeTruthy();
  expect(screen.getByText(/all sources/i)).toBeTruthy();
  expect(screen.getByText(/github only/i)).toBeTruthy();
});

it('explains the four-step live demo flow', () => {
  render(<LandingPage onLaunchDemo={() => undefined} />);

  expect(screen.getByText('Run analysis')).toBeTruthy();
  expect(screen.getByText('Inspect drift')).toBeTruthy();
  expect(screen.getByText('Remove context')).toBeTruthy();
  expect(screen.getByText('Watch confidence fall')).toBeTruthy();
});
```

- [ ] **Step 2: Run the story tests and verify RED**

Run:

```powershell
npm.cmd test -- --run src/components/LandingPage.test.tsx
```

Expected: FAIL because the evidence comparison and demo flow are not rendered.

- [ ] **Step 3: Expand `LandingPage` with the approved content**

Import `DeviceViewer` and add:

```tsx
import { DeviceViewer } from './DeviceViewer';

const capabilities = [
  ['01', 'Review the real assembly', 'Move component by component through the device, not a disconnected issue list.'],
  ['02', 'Connect the engineering record', 'Bring specifications, discussions, review tasks, and implementation evidence together.'],
  ['03', 'Make the next action obvious', 'Turn missing rationale or verification into a focused review task.'],
] as const;

const demoSteps = [
  ['01', 'Run analysis', 'Compare the reviewed design with the current device.'],
  ['02', 'Inspect drift', 'Open the Main Controller evidence trail.'],
  ['03', 'Remove context', 'Switch the workspace to GitHub Only.'],
  ['04', 'Watch confidence fall', 'The answer drops from 96% to 19%.'],
] as const;
```

Render these approved sections:

```tsx
<section className="landing-hero">
  <div className="landing-hero__copy">
    <p className="eyebrow">Medical-device design drift review</p>
    <h1>Know what changed.<br />Prove why.</h1>
    <p className="landing-hero__lede">
      DriftLens gives engineering and quality teams the shared evidence they need
      to do their best work—and make every design decision defensible.
    </p>
    <div className="landing-hero__actions">
      <button className="landing-primary" type="button" onClick={onLaunchDemo}>Launch Demo</button>
      <a className="landing-secondary" href="#demo-flow">See how it works ↓</a>
    </div>
    <p className="landing-demo-note">Live demo · Infusion Pump — Revision B · No setup required</p>
  </div>

  <div className="landing-proof" aria-label="DriftLens product preview">
    <div className="landing-proof__viewer">
      <span className="landing-proof__label">Interactive digital assembly</span>
      <DeviceViewer selectedId="main-controller" analysisComplete={false} onSelect={() => undefined} />
    </div>
    <article className="landing-proof__evidence">
      <p className="eyebrow">Selected component</p>
      <h2>Main Controller</h2>
      <dl>
        <div><dt>Reviewed</dt><dd>5 seconds</dd></div>
        <div><dt>Current</dt><dd>7 seconds</dd></div>
      </dl>
      <div className="landing-proof__confidence">
        <span>Cross-system confidence</span><strong>96%</strong>
      </div>
      <p>Specification found · Code change found · Review evidence missing</p>
    </article>
  </div>
</section>

<section className="landing-capabilities" aria-labelledby="capabilities-title">
  <p className="eyebrow">Designed for the review room</p>
  <h2 id="capabilities-title">Give every decision the context it deserves.</h2>
  <div>
    {capabilities.map(([number, title, detail]) => (
      <article key={number}>
        <span>{number}</span>
        <h3>{title}</h3>
        <p>{detail}</p>
      </article>
    ))}
  </div>
</section>

<section className="landing-context" aria-labelledby="context-title">
  <div>
    <p className="eyebrow">The cross-system difference</p>
    <h2 id="context-title">One change. Two very different answers.</h2>
  </div>
  <article>
    <span>All Sources</span><strong>96%</strong>
    <p>Approved value, implementation, rationale, and review status are visible together.</p>
  </article>
  <article className="is-degraded">
    <span>GitHub Only</span><strong>19%</strong>
    <p>The current value is visible, but the approved value and rationale cannot be determined.</p>
  </article>
</section>

<section className="landing-demo-flow" id="demo-flow" aria-labelledby="demo-flow-title">
  <p className="eyebrow">The 90-second demo</p>
  <h2 id="demo-flow-title">From design drift to a review-ready answer.</h2>
  <div>
    {demoSteps.map(([number, title, detail]) => (
      <article key={number}>
        <span>{number}</span>
        <h3>{title}</h3>
        <p>{detail}</p>
      </article>
    ))}
  </div>
  <button className="landing-primary" type="button" onClick={onLaunchDemo}>Open review workspace →</button>
</section>
```

Finish `LandingPage` with:

```tsx
<footer className="landing-footer">
  <span>DriftLens · Hackathon MVP</span>
  <button className="landing-footer__launch" type="button" onClick={onLaunchDemo}>
    Launch demo →
  </button>
</footer>
```

- [ ] **Step 4: Add the restrained industrial landing-page CSS**

Append CSS to `src/styles.css` using the existing variables and fonts:

```css
.landing-page {
  min-height: 100vh;
  color: var(--ink);
  background:
    linear-gradient(#dfe4e6 1px, transparent 1px),
    linear-gradient(90deg, #dfe4e6 1px, transparent 1px),
    #f4f5f3;
  background-size: 48px 48px;
}
```

Do not use the gradients above because the product brief forbids gradients. Implement the grid with pseudo-elements instead:

```css
.landing-page { position: relative; min-height: 100vh; overflow: hidden; background: #f4f5f3; }
.landing-page::before {
  position: fixed;
  inset: 0;
  z-index: 0;
  content: "";
  pointer-events: none;
  opacity: .35;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Cpath d='M48 0H0V48' fill='none' stroke='%23dfe4e6' stroke-width='1'/%3E%3C/svg%3E");
}
.landing-page > * { position: relative; z-index: 1; }
.landing-nav { display: flex; align-items: center; justify-content: space-between; max-width: 1380px; margin: 0 auto; padding: 22px 34px; border-bottom: 1px solid var(--line); }
.landing-brand { color: #101928; text-decoration: none; font-size: 24px; font-weight: 700; letter-spacing: -.04em; }
.landing-launch, .landing-primary { border: 1px solid #16598f; border-radius: 4px; color: white; background: var(--blue); cursor: pointer; font-weight: 700; }
.landing-launch { padding: 10px 16px; font-size: 11px; }
.landing-primary { padding: 13px 18px; font-size: 12px; }
.landing-hero { display: grid; grid-template-columns: minmax(360px, .82fr) minmax(560px, 1.18fr); gap: 54px; align-items: center; max-width: 1380px; min-height: 680px; margin: 0 auto; padding: 72px 34px; }
.landing-hero h1 { max-width: 690px; margin: 0; color: #101928; font-size: clamp(52px, 6vw, 88px); line-height: .95; letter-spacing: -.065em; }
.landing-hero__lede { max-width: 620px; margin: 28px 0 0; color: #42505b; font-size: 18px; line-height: 1.65; }
.landing-hero__actions { display: flex; gap: 12px; align-items: center; margin-top: 30px; }
.landing-secondary { padding: 12px 14px; color: #174f7c; text-decoration: none; font-size: 12px; font-weight: 700; }
.landing-demo-note { margin: 20px 0 0; color: var(--muted); font: 500 9px "DM Mono", monospace; text-transform: uppercase; letter-spacing: .06em; }
.landing-proof { position: relative; min-height: 520px; border: 1px solid #bfc8cd; background: #eef1f1; }
.landing-proof__viewer { position: absolute; inset: 0; overflow: hidden; }
.landing-proof__label { position: absolute; z-index: 4; top: 16px; left: 18px; color: var(--muted); font: 500 9px "DM Mono", monospace; text-transform: uppercase; letter-spacing: .08em; }
.landing-proof__evidence { position: absolute; right: 18px; bottom: 18px; z-index: 5; width: min(320px, calc(100% - 36px)); padding: 16px; border: 1px solid #bdc8ce; background: #fff; }
.landing-proof__evidence h2 { margin: 0 0 12px; font-size: 20px; }
.landing-proof__evidence dl { display: grid; grid-template-columns: 1fr 1fr; margin: 0; border: 1px solid var(--line); }
.landing-proof__evidence dl div { padding: 9px; }
.landing-proof__evidence dl div + div { border-left: 1px solid var(--line); }
.landing-proof__evidence dt { color: var(--muted); font: 500 8px "DM Mono", monospace; text-transform: uppercase; }
.landing-proof__evidence dd { margin: 5px 0 0; font-size: 12px; font-weight: 700; }
.landing-proof__confidence { display: flex; align-items: end; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); }
.landing-proof__confidence span { color: var(--muted); font-size: 10px; }
.landing-proof__confidence strong { color: var(--blue); font-size: 27px; }
.landing-proof__evidence > p:last-child { margin: 9px 0 0; color: var(--muted); font-size: 9px; line-height: 1.5; }
.landing-capabilities, .landing-context, .landing-demo-flow { max-width: 1380px; margin: 0 auto; padding: 84px 34px; border-top: 1px solid var(--line); }
.landing-capabilities h2, .landing-context h2, .landing-demo-flow h2 { max-width: 760px; margin: 0; color: #101928; font-size: clamp(30px, 4vw, 52px); line-height: 1.08; letter-spacing: -.05em; }
.landing-capabilities > div, .landing-demo-flow > div { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; margin-top: 40px; background: var(--line); border: 1px solid var(--line); }
.landing-capabilities article, .landing-demo-flow article { min-height: 190px; padding: 24px; background: #fff; }
.landing-capabilities article > span, .landing-demo-flow article > span { color: var(--blue); font: 500 10px "DM Mono", monospace; }
.landing-capabilities h3, .landing-demo-flow h3 { margin: 50px 0 8px; font-size: 18px; letter-spacing: -.025em; }
.landing-capabilities article p, .landing-demo-flow article p { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.6; }
.landing-context { display: grid; grid-template-columns: 1.2fr .8fr .8fr; gap: 1px; background: var(--line); }
.landing-context > * { padding: 28px; background: #fff; }
.landing-context article { display: grid; align-content: space-between; min-height: 260px; }
.landing-context article span { font: 500 10px "DM Mono", monospace; text-transform: uppercase; }
.landing-context article strong { color: var(--blue); font-size: 64px; letter-spacing: -.06em; }
.landing-context article p { margin: 0; color: #42505b; font-size: 12px; line-height: 1.6; }
.landing-context article.is-degraded strong { color: var(--gray); }
.landing-demo-flow > div { grid-template-columns: repeat(4, 1fr); }
.landing-demo-flow .landing-primary { display: block; margin: 32px auto 0; }
.landing-footer { display: flex; justify-content: space-between; max-width: 1380px; margin: 0 auto; padding: 24px 34px; border-top: 1px solid var(--line); color: var(--muted); font: 500 9px "DM Mono", monospace; text-transform: uppercase; }
.overview-link { flex: 0 0 auto; margin-right: 4px; padding: 7px 9px; border: 1px solid var(--line); border-radius: 3px; color: #174f7c; background: #f7f9fa; cursor: pointer; font-size: 9px; font-weight: 700; }
@media (prefers-reduced-motion: no-preference) {
  .landing-hero__copy { animation: landing-enter .5s ease-out both; }
  .landing-proof { animation: landing-enter .5s .08s ease-out both; }
}
@keyframes landing-enter {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (max-width: 1040px) {
  .landing-hero { grid-template-columns: 1fr; }
  .landing-proof { min-height: 560px; }
  .landing-context { grid-template-columns: 1fr 1fr; }
  .landing-context > div:first-child { grid-column: 1 / -1; }
}
@media (max-width: 720px) {
  .landing-nav, .landing-hero, .landing-capabilities, .landing-context, .landing-demo-flow, .landing-footer { padding-left: 18px; padding-right: 18px; }
  .landing-hero { min-height: auto; padding-top: 54px; }
  .landing-hero h1 { font-size: 48px; }
  .landing-proof { min-height: 480px; }
  .landing-capabilities > div, .landing-context, .landing-demo-flow > div { grid-template-columns: 1fr; }
  .landing-context > div:first-child { grid-column: auto; }
  .landing-footer { gap: 16px; flex-direction: column; }
}
```

The SVG grid is a flat repeated line asset, not a CSS color gradient. Keep the background subtle enough that it reads as technical drafting paper.

- [ ] **Step 5: Run landing, route, and full tests and verify GREEN**

Run:

```powershell
npm.cmd test -- --run src/components/LandingPage.test.tsx src/App.test.tsx
npm.cmd test -- --run
npm.cmd run build
```

Expected: all tests pass and the Vite production build succeeds. The existing bundle-size warning is acceptable for this R3F hackathon MVP.

- [ ] **Step 6: Perform browser verification**

At `1440 × 900`, verify:

- `/` shows the hero, real device model, evidence card, and both CTA paths.
- “Launch Demo” opens `/review`.
- `/review` retains component selection, analysis, evidence, and GitHub-only degradation.
- “Back to overview” returns to `/`.
- The browser console has no errors.

At `920 × 900`, verify:

- Hero copy and product proof stack without overlap.
- The evidence comparison remains readable.
- The demo steps wrap or stack cleanly.
- The page has no unintended horizontal overflow.

- [ ] **Step 7: Commit the completed landing experience**

```powershell
git add driftlens/src/components/LandingPage.tsx driftlens/src/components/LandingPage.test.tsx driftlens/src/styles.css
git commit -m "feat: build judge-focused DriftLens landing page"
```
