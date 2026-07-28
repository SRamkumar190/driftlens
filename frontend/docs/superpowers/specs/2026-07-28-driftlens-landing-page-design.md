# DriftLens Landing Page Design

## Purpose

The landing page prepares hackathon judges to understand the DriftLens demo in seconds. It presents DriftLens as a focused engineering-review tool that helps medical-device teams do their best work by giving them the shared context needed to review design changes confidently.

The page should make one idea memorable:

> Know what changed. Prove why.

The landing page is not a general marketing site. It exists to set up the live product demonstration and move judges into the review workspace quickly.

## Audience and Success Criteria

The primary audience is hackathon judges watching a short product demo.

The page succeeds when a judge can understand, before launching the workspace:

1. DriftLens compares the reviewed design with the current implementation.
2. It connects evidence across engineering systems.
3. Cross-system context produces a more useful and defensible answer.
4. The product helps engineering and quality teams work with greater clarity and confidence.

The primary action is launching the interactive review workspace.

## Information Architecture

### Routes

- `/` — judge-focused landing page.
- `/review` — the existing DriftLens review workspace.

The implementation will use the browser History API and local React state rather than adding a routing dependency. Direct navigation to `/review` must render the workspace, and browser back/forward navigation must keep the correct page visible.

### Landing Page Structure

1. **Compact navigation**
   - DriftLens identity.
   - “How it works” anchor.
   - Primary “Launch Demo” action.

2. **Hero**
   - Eyebrow identifying DriftLens as a design-drift review workspace.
   - Headline: “Know what changed. Prove why.”
   - Supporting copy focused on helping engineering and quality teams do their best work with shared evidence.
   - Primary CTA: “Launch Demo.”
   - Secondary CTA: “See how it works.”
   - A concise demo note explaining that the workspace uses an infusion-pump revision.

3. **Product proof composition**
   - A cropped, technical representation of the existing infusion-pump model.
   - A compact evidence card showing reviewed value, current value, confidence, and source coverage.
   - The composition should resemble the real workspace rather than a generic dashboard illustration.

4. **Three product capabilities**
   - Review the device component by component.
   - Connect specifications, discussions, tasks, and code.
   - Turn missing evidence into a clear next action.

5. **Demo flow**
   - Run analysis.
   - Inspect a design drift.
   - Switch to GitHub Only.
   - Watch confidence fall from 96% to 19%.
   - Launch the workspace directly from this section.

6. **Minimal footer**
   - DriftLens name.
   - Hackathon MVP descriptor.
   - Link to launch the demo.

## Visual Direction

The landing page extends the existing industrial and utilitarian design language:

- Warm off-white workspace background.
- Dark navy typography.
- Thin technical rules and measured spacing.
- Restrained blue for navigation and actions.
- Status colors only when communicating review state.
- Manrope for readable interface copy and DM Mono for technical labels.
- Flat panels with crisp borders and minimal shadow.
- Subtle entrance motion limited to the hero and product proof composition.

The page must avoid gradients, glassmorphism, oversized decorative type, generic AI imagery, excessive animation, and conventional startup-site filler.

The memorable visual is the evidence-confidence comparison: complete cross-system context at 96% beside GitHub-only context at 19%.

## Component Boundaries

- `App` owns lightweight route selection and browser navigation handling.
- `LandingPage` renders the landing experience and receives an `onLaunchDemo` callback.
- `ReviewWorkspace` contains the current workspace without changing its data or 3D interaction contracts.
- `BrandMark` may be shared between the landing page and workspace masthead if extraction improves clarity.

The existing `DeviceViewer`, `Sidebar`, `EvidencePanel`, data contracts, GLB loading logic, and evidence behavior remain unchanged.

## Interaction and Accessibility

- “Launch Demo” navigates to `/review` without a full page reload.
- “See how it works” scrolls to the demo-flow section.
- A visible “Back to overview” action on `/review` returns to `/`.
- Navigation actions use semantic links or buttons with clear accessible names.
- Keyboard focus remains visible.
- Reduced-motion preferences disable entrance and scrolling animation.
- The landing page must remain readable at laptop and narrow-tablet widths.

## Error Handling

The landing page has no remote dependencies and therefore needs no network error state. The existing visible model-loading error remains scoped to the review workspace.

Unknown local paths fall back to the landing page. Direct `/review` loads must render the workspace correctly under the Vite development and production fallback behavior.

## Testing

Automated tests will verify:

- `/` renders the landing headline and launch CTA.
- Launching the demo changes the route to `/review` and renders the existing workspace.
- Direct `/review` rendering works.
- Returning to the overview restores the landing page.
- The landing page includes the cross-system 96% to 19% confidence story.
- Existing workspace tests continue to pass.

Visual verification will cover:

- Desktop presentation at 1440 × 900.
- Responsive presentation near the existing 920px breakpoint.
- Landing-to-review navigation.
- Review interaction remains unchanged.
- No browser console errors.

## Scope

The landing page will not add authentication, data persistence, analytics, pricing, testimonials, signup forms, admin features, notifications, or new product workflows.
