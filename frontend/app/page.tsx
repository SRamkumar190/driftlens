"use client";

import { useMemo, useState } from "react";
import { COMPONENTS, type ComponentResult, type DriftStatus } from "./sample-data";

const STATUS_COPY: Record<
  DriftStatus,
  { label: string; short: string; tone: string }
> = {
  matches_design: {
    label: "Matches design",
    short: "Aligned",
    tone: "var(--green)",
  },
  verification_incomplete: {
    label: "Verification incomplete",
    short: "Verify",
    tone: "var(--amber)",
  },
  unreviewed_drift: {
    label: "Unreviewed drift",
    short: "Drift",
    tone: "var(--coral)",
  },
  insufficient_evidence: {
    label: "Insufficient evidence",
    short: "Unknown",
    tone: "var(--slate)",
  },
};

const SOURCE_META = [
  { key: "drive_evidence", name: "Drive", glyph: "D" },
  { key: "slack_evidence", name: "Slack", glyph: "S" },
  { key: "linear_evidence", name: "Linear", glyph: "L" },
  { key: "github_evidence", name: "GitHub", glyph: "G" },
] as const;

function StatusPill({ status }: { status: DriftStatus }) {
  const item = STATUS_COPY[status];
  return (
    <span className="status-pill" style={{ "--tone": item.tone } as React.CSSProperties}>
      <span className="status-dot" />
      {item.label}
    </span>
  );
}

function DeviceModel({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="device-stage" aria-label="Interactive infusion pump component map">
      <div className="stage-grid" />
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <div className="device-shadow" />
      <div className="pump">
        <div className="pump-handle" />
        <div className="pump-body">
          <div className="pump-face">
            <div className="screen">
              <span className="screen-kicker">INFUSION</span>
              <strong>12.0</strong>
              <span>mL / hr</span>
              <div className="screen-line"><i /><i /><i /></div>
            </div>
            <div className="controls">
              <i /><i /><i /><i /><i /><i />
            </div>
          </div>
          <div className="cassette-window">
            <span />
            <span />
            <span />
          </div>
          <div className="device-rail" />
        </div>
      </div>

      <div className="exploded-line line-one" />
      <div className="exploded-line line-two" />
      <div className="exploded-line line-three" />

      {COMPONENTS.map((component, index) => {
        const meta = STATUS_COPY[component.status];
        return (
          <button
            className={`component-part part-${index + 1} ${
              selected === component.component_id ? "is-selected" : ""
            }`}
            key={component.component_id}
            onClick={() => onSelect(component.component_id)}
            aria-label={`Inspect ${component.component_name}: ${meta.label}`}
            aria-pressed={selected === component.component_id}
            style={{ "--tone": meta.tone } as React.CSSProperties}
          >
            <span className="part-surface">
              <i className="part-detail detail-a" />
              <i className="part-detail detail-b" />
              <i className="part-detail detail-c" />
            </span>
            <span className="component-pin">
              <i />
              <span>
                <b>0{index + 1}</b>
                {component.component_name}
              </span>
            </span>
          </button>
        );
      })}
      <div className="axis-label">EXPLODED COMPONENT VIEW · REV 3.2</div>
    </div>
  );
}

export default function Home() {
  const [selectedId, setSelectedId] = useState(COMPONENTS[1].component_id);
  const [result, setResult] = useState<ComponentResult>(COMPONENTS[1]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Evidence synchronized 18 seconds ago");

  const selected = useMemo(
    () => COMPONENTS.find((item) => item.component_id === selectedId) ?? COMPONENTS[0],
    [selectedId],
  );

  async function investigate(id: string) {
    setSelectedId(id);
    const optimistic = COMPONENTS.find((item) => item.component_id === id);
    if (optimistic) setResult(optimistic);
    setLoading(true);
    setMessage("Tracing evidence across connected sources…");
    try {
      const response = await fetch("/api/investigate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ component_id: id }),
      });
      if (!response.ok) throw new Error("Investigation request failed");
      setResult((await response.json()) as ComponentResult);
      setMessage("Evidence trace complete · demo dataset");
    } catch {
      setMessage("Showing the latest verified local snapshot");
    } finally {
      setLoading(false);
    }
  }

  const connectedCount = SOURCE_META.filter((source) => result[source.key]).length;

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#" aria-label="DriftLens home">
          <span className="brand-mark"><i /><i /></span>
          <span>DRIFT<b>LENS</b></span>
        </a>
        <div className="case-meta">
          <span className="eyebrow">ACTIVE REVIEW</span>
          <strong>Infusion Pump · IP-042</strong>
          <span className="revision">DESIGN REV 3.2</span>
        </div>
        <div className="header-actions">
          <span className="sync-state"><i /> {message}</span>
          <button className="avatar" aria-label="Reviewer profile">DR</button>
        </div>
      </header>

      <section className="workspace">
        <aside className="component-list">
          <div className="section-heading">
            <div>
              <span className="eyebrow">SYSTEM MAP</span>
              <h1>Component review</h1>
            </div>
            <span className="count">{COMPONENTS.length}</span>
          </div>
          <p className="intro">
            Select a component to trace its reviewed intent against the current implementation.
          </p>
          <div className="component-nav">
            {COMPONENTS.map((component, index) => {
              const meta = STATUS_COPY[component.status];
              const active = selectedId === component.component_id;
              return (
                <button
                  key={component.component_id}
                  className={`component-row ${active ? "active" : ""}`}
                  onClick={() => investigate(component.component_id)}
                  style={{ "--tone": meta.tone } as React.CSSProperties}
                >
                  <span className="row-index">0{index + 1}</span>
                  <span className="row-copy">
                    <strong>{component.component_name}</strong>
                    <small>{meta.short}</small>
                  </span>
                  <span className="row-status" />
                </button>
              );
            })}
          </div>
          <div className="legend">
            <span className="eyebrow">STATUS KEY</span>
            {Object.entries(STATUS_COPY).map(([key, value]) => (
              <div key={key}><i style={{ background: value.tone }} />{value.label}</div>
            ))}
          </div>
          <div className="scope-note">
            <span>Human review required</span>
            DriftLens surfaces evidence. It does not determine safety, compliance, or fault.
          </div>
        </aside>

        <section className="model-panel">
          <div className="model-toolbar">
            <div>
              <span className="eyebrow">DEVICE DIGITAL TWIN</span>
              <h2>Infusion Pump IP-042</h2>
            </div>
            <div className="view-controls" aria-label="View controls">
              <button className="active">Exploded</button>
              <button>Assembled</button>
            </div>
          </div>
          <DeviceModel selected={selected.component_id} onSelect={investigate} />
          <div className="model-footer">
            <span><kbd>CLICK</kbd> inspect component</span>
            <span><i className="live-dot" /> 4 evidence sources connected</span>
            <span>Last design review · 14 Jun 2026</span>
          </div>
        </section>

        <aside className={`evidence-panel ${loading ? "is-loading" : ""}`}>
          <div className="evidence-topline">
            <span className="eyebrow">EVIDENCE TRACE</span>
            <span className="confidence">{Math.round(result.confidence * 100)}% confidence</span>
          </div>
          <h2>{result.component_name}</h2>
          <span className="component-code">{result.component_id}</span>
          <StatusPill status={result.status} />

          <div className="comparison">
            <div>
              <span>Reviewed design</span>
              <strong>{result.reviewed_value ?? "Not found"}</strong>
            </div>
            <div className="comparison-arrow">→</div>
            <div>
              <span>Implementation</span>
              <strong>{result.implemented_value ?? "Not found"}</strong>
            </div>
          </div>

          <div className="finding">
            <span className="eyebrow">FINDING</span>
            <p>{result.conclusion}</p>
          </div>

          <div className="sources-heading">
            <span className="eyebrow">SOURCE EVIDENCE</span>
            <span>{connectedCount} / 4 found</span>
          </div>
          <div className="evidence-sources">
            {SOURCE_META.map((source) => {
              const evidence = result[source.key];
              return (
                <article className={evidence ? "" : "missing"} key={source.key}>
                  <div className="source-icon">{source.glyph}</div>
                  <div>
                    <strong>{source.name}<span>{evidence ? "Evidence found" : "No evidence"}</span></strong>
                    <p>{evidence ?? "No related item was retrieved from this source."}</p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="recommended">
            <span className="eyebrow">RECOMMENDED NEXT STEP</span>
            <p>{result.recommended_action}</p>
            <button onClick={() => investigate(result.component_id)} disabled={loading}>
              {loading ? "Tracing evidence…" : "Refresh investigation"}
              <span>↗</span>
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}
