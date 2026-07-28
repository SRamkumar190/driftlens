import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { components } from '../data/components';
import { ReviewWorkspace } from './ReviewWorkspace';

const deviceViewerRenderLog = vi.hoisted(() => ({ focusRequestKeys: [] as number[] }));

vi.mock('./DeviceViewer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./DeviceViewer')>();
  return {
    ...actual,
    DeviceViewer: (props: Parameters<typeof actual.DeviceViewer>[0]) => {
      deviceViewerRenderLog.focusRequestKeys.push(
        (props as typeof props & { focusRequestKey?: number }).focusRequestKey ?? -1,
      );
      return <actual.DeviceViewer {...props} />;
    },
  };
});

describe('ReviewWorkspace', () => {
  afterEach(() => {
    cleanup();
    deviceViewerRenderLog.focusRequestKeys.length = 0;
  });

  it('starts with the device canvas visible and no component evidence selected', () => {
    render(<ReviewWorkspace />);

    expect(screen.getByRole('heading', { name: 'Medical Device View' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Review states' })).toBeTruthy();
    expect(screen.queryByRole('complementary', { name: 'Selected component evidence' })).toBeNull();

    const componentNav = screen.getByRole('navigation', { name: /device components/i });
    within(componentNav).getAllByRole('button').forEach((button) => {
      expect(button.getAttribute('aria-pressed')).toBe('false');
      expect(button.getAttribute('aria-expanded')).toBe('false');
    });

    expect(screen.queryByText(/source context/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /github only/i })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'How DriftLens works' })).toBeNull();
  });

  it('opens complete component evidence from a compact component control', () => {
    render(<ReviewWorkspace />);

    const componentNav = screen.getByRole('navigation', { name: /device components/i });
    const componentControl = within(componentNav).getByRole('button', { name: /main controller/i });
    fireEvent.click(componentControl);

    const drawer = screen.getByRole('complementary', { name: 'Selected component evidence' });
    expect(componentControl.getAttribute('aria-controls')).toBe('component-evidence');
    expect(componentControl.getAttribute('aria-expanded')).toBe('true');
    expect(within(drawer).getByRole('heading', { name: 'Main Controller' })).toBeTruthy();
    expect(within(drawer).getByText('96%')).toBeTruthy();
    expect(within(drawer).getByText(components['main-controller'].conclusion)).toBeTruthy();
    expect(within(drawer).getByText('Google Drive')).toBeTruthy();
    expect(within(drawer).getByText('Slack')).toBeTruthy();
    expect(within(drawer).getByText('Linear')).toBeTruthy();
    expect(within(drawer).getByRole('button', { name: /draft review task/i })).toBeTruthy();
  });

  it('opens the same evidence drawer from the device-viewer selection control', () => {
    render(<ReviewWorkspace />);

    fireEvent.click(screen.getByRole('button', { name: /select occlusion sensor/i }));

    const drawer = screen.getByRole('complementary', { name: 'Selected component evidence' });
    expect(drawer.id).toBe('component-evidence');
    expect(within(drawer).getByRole('heading', { name: 'Occlusion Sensor' })).toBeTruthy();
  });

  it('requests camera focus again when the selected compact component is reselected', () => {
    render(<ReviewWorkspace />);

    const componentNav = screen.getByRole('navigation', { name: /device components/i });
    const mainController = within(componentNav).getByRole('button', { name: /main controller/i });
    fireEvent.click(mainController);
    const firstRequest = deviceViewerRenderLog.focusRequestKeys.at(-1);

    fireEvent.click(mainController);
    const repeatedRequest = deviceViewerRenderLog.focusRequestKeys.at(-1);

    expect(firstRequest).toBe(1);
    expect(repeatedRequest).toBe(2);
  });

  it('closes evidence and restores focus without clearing the compact selected state', () => {
    render(<ReviewWorkspace />);

    const componentNav = screen.getByRole('navigation', { name: /device components/i });
    const flowSensorControl = within(componentNav).getByRole('button', { name: /flow sensor/i });
    fireEvent.click(flowSensorControl);
    fireEvent.click(screen.getByRole('button', { name: /close component evidence/i }));

    expect(screen.queryByRole('complementary', { name: 'Selected component evidence' })).toBeNull();
    expect(flowSensorControl.getAttribute('aria-pressed')).toBe('true');
    expect(flowSensorControl.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(flowSensorControl);
  });

  it('closes evidence on Escape without clearing the compact selected state', () => {
    render(<ReviewWorkspace />);

    const componentNav = screen.getByRole('navigation', { name: /device components/i });
    const batteryControl = within(componentNav).getByRole('button', { name: /battery module/i });
    fireEvent.click(batteryControl);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('complementary', { name: 'Selected component evidence' })).toBeNull();
    expect(batteryControl.getAttribute('aria-pressed')).toBe('true');
  });

  it('reports analysis completion without opening component evidence', () => {
    render(<ReviewWorkspace />);

    fireEvent.click(screen.getByRole('button', { name: /run drift analysis/i }));

    expect(screen.getByRole('status').textContent).toMatch(/components analyzed/i);
    expect(screen.queryByRole('complementary', { name: 'Selected component evidence' })).toBeNull();
  });
});
