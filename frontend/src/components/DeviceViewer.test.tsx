import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DeviceViewer } from './DeviceViewer'

afterEach(cleanup)

describe('DeviceViewer', () => {
  it('provides unselected labelled fallback controls when no device part is selected', () => {
    render(<DeviceViewer selectedId={null} focusRequestKey={0} onSelect={vi.fn()} analysisComplete />)

    expect(screen.getByRole('group', { name: /interactive infusion pump/i })).toBeTruthy()
    screen.getAllByRole('button').forEach((button) => {
      expect(button.getAttribute('aria-pressed')).toBe('false')
    })
  })

  it('notifies the parent when a fallback part control is selected from an unselected state', () => {
    const onSelect = vi.fn()
    render(<DeviceViewer selectedId={null} focusRequestKey={0} onSelect={onSelect} analysisComplete />)

    fireEvent.click(screen.getByRole('button', { name: /select occlusion sensor/i }))

    expect(onSelect).toHaveBeenCalledWith('occlusion-sensor')
  })
})
