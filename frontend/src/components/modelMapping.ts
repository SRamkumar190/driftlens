import { Box3, Mesh, Object3D, Vector3 } from 'three'
import type { ComponentId, ReviewStatus } from '../data/components'

export const componentModelNames: Record<ComponentId, string> = {
  'main-controller': 'Main Controller',
  'flow-sensor': 'Flow Sensor',
  'pump-motor': 'Pump Motor',
  'occlusion-sensor': 'Occlusion Sensor',
  'battery-module': 'Battery Module',
}

export type ComponentNodeMap = Record<ComponentId, Object3D>

export const statusColors: Record<ReviewStatus, string> = {
  critical: '#d83b35',
  warning: '#e2aa28',
  approved: '#3b9b68',
  unreviewed: '#8a959d',
}

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

export function applyComponentStatusColors(
  mapping: ComponentNodeMap,
  statuses: Partial<Record<ComponentId, ReviewStatus>>,
  analysisComplete: boolean,
) {
  Object.entries(mapping).forEach(([componentId, node]) => {
    const status = analysisComplete
      ? statuses[componentId as ComponentId] ?? 'unreviewed'
      : 'unreviewed'
    const color = statusColors[status]

    node.traverse((child) => {
      if (!(child instanceof Mesh)) return
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      materials.forEach((material) => {
        if ('color' in material && material.color) {
          material.color.set(color)
          material.needsUpdate = true
        }
      })
    })
  })
}
