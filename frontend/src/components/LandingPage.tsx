import { DeviceViewer } from './DeviceViewer';

export interface LandingPageProps {
  onLaunchDemo: () => void;
}

const capabilities = [
  ['01', 'Review the real assembly', 'Move component by component through the device, not a disconnected issue list.'],
  ['02', 'Connect the engineering record', 'Bring specifications, discussions, review tasks, and implementation evidence together.'],
  ['03', 'Make the next action obvious', 'Turn missing rationale or verification into a focused review task.'],
] as const;

const demoSteps = [
  ['01', 'Run analysis', 'Compare the reviewed design with the current device.'],
  ['02', 'Select a component', 'Choose a model part or compact component control.'],
  ['03', 'Inspect evidence', 'Review the complete cross-system evidence trail.'],
  ['04', 'Draft the review action', 'Turn the recommendation into a focused review task.'],
] as const;

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
        <div className="landing-hero__copy">
          <p className="eyebrow">Medical-device design drift review</p>
          <h1 aria-label="Know what changed. Prove why.">Know what changed.<br />Prove why.</h1>
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
          <div className="landing-proof__viewer" inert aria-hidden="true">
            <span className="landing-proof__label">Interactive digital assembly</span>
            <DeviceViewer
              selectedId="main-controller"
              focusRequestKey={0}
              analysisComplete={false}
              onSelect={() => undefined}
            />
          </div>
          <article className="landing-proof__evidence">
            <p className="eyebrow">Selected component</p>
            <h2>Main Controller</h2>
            <dl>
              <div><dt>Reviewed</dt><dd>5 seconds</dd></div>
              <div><dt>Current</dt><dd>7 seconds</dd></div>
            </dl>
            <div className="landing-proof__confidence">
              <span>Cross-system confidence</span><strong><span>96</span>%</strong>
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

      <footer className="landing-footer">
        <span>DriftLens · Hackathon MVP</span>
        <button className="landing-footer__launch" type="button" onClick={onLaunchDemo}>
          Launch demo →
        </button>
      </footer>
    </main>
  );
}
