# DriftLens device-first review workspace

## Final behavior

The `/review` route now opens on an unselected infusion-pump canvas. No component
outline or evidence region is present until a user selects a model part or one
of the five compact component controls.

Both selection paths update the selected component and open the same
`component-evidence` drawer over the right side of the canvas. The drawer is a
non-modal complementary region, so the model remains visible and the rest of
the workspace remains usable. It presents the selected component's status,
reviewed and current values, original confidence, original conclusion, complete
evidence checklist, recommendation, and Draft Review Task action.

The visible `Close component evidence` button and the Escape key close only the
drawer. The selected component remains selected and outlined, keyboard focus
returns to its compact component control, and the evidence is ready to reopen
through either selection path. Re-selecting the same component issues a new
camera-focus request and reopens/refocuses its evidence. The document-level
Escape listener exists only while the drawer is open and is removed when the
drawer closes or the workspace unmounts.

Run Drift Analysis changes only the analysis state. It reports that five
components were analyzed without selecting a component or opening evidence.
Review States remains directly below the expanded canvas.

The real `/models/infusion-pump.glb` loading path, cloned authored materials,
mesh selection mapping, orbit controls, contact shadows, and camera focus
behavior are preserved. A null selection skips camera focusing and selection
outlines.

## Component interfaces

- `DeviceViewerProps.selectedId` is `ComponentId | null`;
  `focusRequestKey: number` requests camera focus even when the selected ID is
  unchanged; `onSelect` remains `(id: ComponentId) => void`, and
  `analysisComplete` remains a boolean.
- `SidebarProps` accepts `selectedId: ComponentId | null`, `drawerOpen`,
  `analysisComplete`, `onSelect`, and `onRunAnalysis`. Source-mode props were
  removed.
- `EvidencePanelProps` is `{ component: DeviceComponent; onClose: () => void }`.
  EvidencePanel no longer branches by source mode and always renders the
  component's complete evidence.
- `ReviewWorkspace` owns `selectedId`, `focusRequestKey`, `drawerOpen`, and
  `analysisComplete`. Compact controls expose stable `data-component-id`
  focus targets, point to `component-evidence` with `aria-controls`, and expose
  the active drawer relationship with `aria-expanded`.

## Responsive and motion behavior

The review workspace uses the full available width for the device column and a
minimum 640px viewer height. At desktop and laptop widths, the drawer is 400px
wide, capped so at least 96px of canvas remains visible. This remains an overlay
at the 920px layout breakpoint rather than moving evidence below the model.

At phone widths up to 620px, the drawer becomes
`calc(100% - 24px)` wide, leaving a narrow visible canvas edge. Its restrained
entrance uses a 24px right-to-left transform and opacity transition. Motion is
enabled only under `prefers-reduced-motion: no-preference`; reduced-motion users
receive the final state without animation.

The established flat industrial palette, solid borders, compact mono labels,
and unaltered landing-page styling remain in place. No gradient or glass
treatment was introduced.

## Removed review UI

- Source Context, All Sources, and GitHub Only review controls
- GitHub-only evidence degradation and context warning
- How DriftLens Works workflow data, markup, and workflow-only CSS
- The old abstract rotated masthead mark

The landing page's static 96%/19% context comparison is intentionally unchanged.
Only its live-demo sequence changed to: Run analysis, Select a component,
Inspect evidence, Draft the review action.

## Verification

RED was captured before production edits with:

```powershell
npm.cmd test -- --run src/components/ReviewWorkspace.test.tsx src/components/DeviceViewer.test.tsx src/components/LandingPage.test.tsx
```

Result: exit 1 with seven expected behavioral failures (six review-workspace
contracts and one landing demo-sequence contract). The two nullable
DeviceViewer runtime tests already passed; the production change completed its
TypeScript contract and protected the real model outline/focus paths.

GREEN and regression verification:

```powershell
npm.cmd test -- --run src/components/ReviewWorkspace.test.tsx src/components/DeviceViewer.test.tsx src/components/LandingPage.test.tsx
# 3 files passed, 13 tests passed

npm.cmd test -- --run
# 7 files passed, 29 tests passed

npm.cmd run build
# TypeScript and Vite production build passed; 596 modules transformed
```

Vitest continues to print the existing multiple-Three.js-instance warning. The
production build continues to print Vite's existing large-chunk advisory for
the 1,170.30 kB JavaScript bundle.

### Browser verification

Browser verification completed at both 1440x900 and 920x900:

- The review workspace initially showed the device with no selected component
  and no evidence drawer.
- Selecting a component opened the evidence drawer as a right-side overlay
  within the canvas; it did not move below the viewer.
- Neither viewport had horizontal overflow. At 1440x900, document client and
  scroll widths were both 1425px. At 920x900, both were 905px.
- Both the visible Close button and Escape preserved the selected component and
  restored keyboard focus to its compact component control.
- Run Drift Analysis reported completion without opening the evidence drawer.
- Re-selecting the same component reopened its evidence and issued a new camera
  focus request.
- The landing page showed the updated four-step sequence: Run analysis, Select
  a component, Inspect evidence, Draft the review action.
- The Open review workspace action navigated to `/review`.
- The browser console contained zero errors and zero warnings.
