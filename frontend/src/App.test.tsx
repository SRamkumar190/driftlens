import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

describe('App routing', () => {
  beforeEach(() => window.history.replaceState({}, '', '/'));
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the landing page at the root path', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Know what changed. Prove why.' })).toBeTruthy();
  });

  it('launches the review workspace without a reload', () => {
    const pushState = vi.spyOn(window.history, 'pushState');
    render(<App />);
    const launchButtons = screen.getAllByRole('button', { name: 'Launch Demo' });
    fireEvent.click(launchButtons[1]);

    expect(pushState).toHaveBeenCalledWith({}, '', '/review');
    expect(window.location.pathname).toBe('/review');
    expect(screen.getByRole('heading', { name: 'Medical Device View' })).toBeTruthy();
  });

  it('supports direct review-workspace navigation', () => {
    window.history.replaceState({}, '', '/review');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Medical Device View' })).toBeTruthy();
  });

  it('returns from the workspace to the overview', () => {
    const replaceState = vi.spyOn(window.history, 'replaceState');
    const pushState = vi.spyOn(window.history, 'pushState');
    window.history.replaceState({}, '', '/review');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Back to overview/ }));

    expect(replaceState).toHaveBeenLastCalledWith({}, '', '/');
    expect(pushState).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/');
    expect(screen.getByRole('heading', { name: 'Know what changed. Prove why.' })).toBeTruthy();
  });

  it('synchronizes the rendered route after browser history changes', () => {
    render(<App />);

    act(() => {
      window.history.pushState({}, '', '/review');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.getByRole('heading', { name: 'Medical Device View' })).toBeTruthy();

    act(() => {
      window.history.replaceState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.getByRole('heading', { name: 'Know what changed. Prove why.' })).toBeTruthy();
  });

  it('falls back to the landing page for unknown paths', () => {
    window.history.replaceState({}, '', '/unknown');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Know what changed. Prove why.' })).toBeTruthy();
  });
});
