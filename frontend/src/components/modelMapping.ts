import { Box3, Object3D, Vector3 } from 'three'
import type { ComponentId } from '../data/components'

export const componentModelNames: Record<ComponentId, string> = {
  'main-controller': 'Main Controller',
  'flow-sensor': 'Flow Sensor',
  'pump-motor': 'Pump Motor',
  'occlusion-sensor': 'Occlusion Sensor',
  'battery-module': 'Battery Module',
}

export type ComponentNodeMap = Record<ComponentId, Object3D>

export function normalizeModelNodeName(name: string) {
  return name
    .replace(/\.\d+$/, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase()
}

export function buildComponentNodeMap(root: Object3D): ComponentNodeMap {
  const nodesByName = new Map<string, Object3D>()
  root.traverse((node) => {
    if (node.name) nodesByName.set(normalizeModelNodeName(node.name), node)
  })

  const missing: string[] = []
  const entries = Object.entries(componentModelNames).map(([id, modelName]) => {
    const node = nodesByName.get(normalizeModelNodeName(modelName))
    if (!node) missing.push(modelName)
    return [id, node] as const
  })

  if (missing.length) {
    throw new Error(`Missing model groups: ${missing.join(', ')}`)
  }

  return Object.fromEntries(entries) as ComponentNodeMap
}

export function calculateFocusPose(node: Object3D, context: Object3D = node) {
  const selectedCenter = new Box3().setFromObject(node).getCenter(new Vector3())
  const contextBounds = new Box3().setFromObject(context)
  const contextCenter = contextBounds.getCenter(new Vector3())
  const contextSize = contextBounds.getSize(new Vector3())
  const target = contextCenter.lerp(selectedCenter, 0.28)
  const distance = Math.max(contextSize.x, contextSize.y, contextSize.z) * 1.6
  const cameraPosition = new Vector3(target.x, target.y, target.z + Math.max(distance, 5.5))

  return { target, cameraPosition }
}
