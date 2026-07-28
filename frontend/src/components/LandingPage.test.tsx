import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LandingPage } from './LandingPage';

describe('LandingPage', () => {
  afterEach(cleanup);

  it('introduces the product to hackathon judges', () => {
    render(<LandingPage onLaunchDemo={() => undefined} />);

    expect(screen.getByRole('heading', { name: 'Know what changed. Prove why.' })).toBeTruthy();
    expect(screen.getByText(/do their best work/i)).toBeTruthy();
  });

  it('launches the interactive demo', () => {
    const onLaunchDemo = vi.fn();
    render(<LandingPage onLaunchDemo={onLaunchDemo} />);

    const launchButtons = screen.getAllByRole('button', { name: 'Launch Demo' });
    expect(launchButtons).toHaveLength(2);
    fireEvent.click(launchButtons[1]);
    expect(onLaunchDemo).toHaveBeenCalledTimes(1);
  });

  it('demonstrates why cross-system context matters', () => {
    render(<LandingPage onLaunchDemo={() => undefined} />);

    const comparison = screen.getByRole('region', { name: 'One change. Two very different answers.' });
    expect(within(comparison).getByText('96%')).toBeTruthy();
    expect(within(comparison).getByText('19%')).toBeTruthy();
    expect(within(comparison).getByText(/all sources/i)).toBeTruthy();
    expect(within(comparison).getByText(/github only/i)).toBeTruthy();
  });

  it('explains the four-step live demo flow', () => {
    render(<LandingPage onLaunchDemo={() => undefined} />);

    const demoFlow = screen.getByRole('region', { name: 'From design drift to a review-ready answer.' });
    const stepHeadings = within(demoFlow).getAllByRole('heading', { level: 3 });
    expect(stepHeadings.map((heading) => heading.textContent)).toEqual([
      'Run analysis',
      'Select a component',
      'Inspect evidence',
      'Draft the review action',
    ]);
    expect(within(demoFlow).queryByText(/github only/i)).toBeNull();
  });

  it('keeps the decorative device preview controls out of the accessibility tree', () => {
    render(<LandingPage onLaunchDemo={() => undefined} />);

    expect(screen.queryByRole('group', { name: /interactive infusion pump part controls/i })).toBeNull();
  });
});
