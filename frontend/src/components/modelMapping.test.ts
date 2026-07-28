import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Object3D } from 'three'
import { describe, expect, it } from 'vitest'
import {
  buildComponentNodeMap,
  calculateFocusPose,
  normalizeModelNodeName,
} from './modelMapping'

function namedPart(name: string, position: [number, number, number]) {
  const group = new Group()
  group.name = name
  const mesh = new Mesh(new BoxGeometry(2, 1, 1), new MeshBasicMaterial())
  mesh.position.set(...position)
  group.add(mesh)
  return group
}

describe('model component mapping', () => {
  it('normalizes exported node names consistently', () => {
    expect(normalizeModelNodeName('Main_Controller.001')).toBe('maincontroller')
    expect(normalizeModelNodeName(' Occlusion-Sensor ')).toBe('occlusionsensor')
  })

  it('maps all five required named groups', () => {
    const root = new Object3D()
    root.add(
      namedPart('Main Controller', [0, 1, 0]),
      namedPart('Flow Sensor', [1, 0, 0]),
      namedPart('Pump Motor', [0, 0, 0]),
      namedPart('Occlusion Sensor', [-1, 0, 0]),
      namedPart('Battery Module', [0, -1, 0]),
    )

    const mapping = buildComponentNodeMap(root)

    expect(Object.keys(mapping)).toEqual([
      'main-controller',
      'flow-sensor',
      'pump-motor',
      'occlusion-sensor',
      'battery-module',
    ])
    expect(mapping['main-controller'].name).toBe('Main Controller')
  })

  it('reports every missing required group', () => {
    const root = new Object3D()
    root.add(namedPart('Main Controller', [0, 0, 0]))

    expect(() => buildComponentNodeMap(root)).toThrow(
      'Missing model groups: Flow Sensor, Pump Motor, Occlusion Sensor, Battery Module',
    )
  })

  it('calculates a centered camera target from a selected group', () => {
    const part = namedPart('Main Controller', [2, 3, 1])
    const pose = calculateFocusPose(part)

    expect(pose.target.toArray()).toEqual([2, 3, 1])
    expect(pose.cameraPosition.z).toBeGreaterThan(3)
    expect(pose.cameraPosition.x).toBe(2)
    expect(pose.cameraPosition.y).toBe(3)
  })

  it('keeps full-device context while biasing focus toward a selected part', () => {
    const device = new Group()
    const housing = namedPart('Housing', [0, 0, 0])
    housing.scale.set(2, 5, 1)
    const selected = namedPart('Flow Sensor', [2, 2, 0])
    device.add(housing, selected)

    const pose = calculateFocusPose(selected, device)

    expect(pose.target.x).toBeGreaterThan(0)
    expect(pose.target.x).toBeLessThan(2)
    expect(pose.cameraPosition.z).toBeGreaterThanOrEqual(8)
  })
})
