import { ContactShadows, OrbitControls, useGLTF } from '@react-three/drei'
import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { Component, Suspense, useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import {
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  type Object3D,
  Vector3,
} from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { ComponentId } from '../data/components'
import {
  buildComponentNodeMap,
  calculateFocusPose,
  componentModelNames,
  type ComponentNodeMap,
} from './modelMapping'

const MODEL_URL = '/models/infusion-pump.glb'
const OUTLINE_NAME = '__driftlens-selection-outline'

export interface DeviceViewerProps {
  selectedId: ComponentId | null
  focusRequestKey: number
  onSelect: (id: ComponentId) => void
  analysisComplete: boolean
}

function cloneModel(source: Object3D) {
  const clone = source.clone(true)
  clone.traverse((node) => {
    if (!(node instanceof Mesh)) return
    node.material = Array.isArray(node.material)
      ? node.material.map((material) => material.clone())
      : node.material.clone()
    node.castShadow = true
    node.receiveShadow = true
  })
  return clone
}

function clearSelectionOutlines(root: Object3D) {
  const outlines: Object3D[] = []
  root.traverse((node) => {
    if (node.name === OUTLINE_NAME) outlines.push(node)
  })
  outlines.forEach((outline) => {
    outline.parent?.remove(outline)
    if (outline instanceof LineSegments) {
      outline.geometry.dispose()
      if (Array.isArray(outline.material)) outline.material.forEach((material) => material.dispose())
      else outline.material.dispose()
    }
  })
}

function addSelectionOutlines(node: Object3D) {
  node.traverse((child) => {
    if (!(child instanceof Mesh)) return
    const outline = new LineSegments(
      new EdgesGeometry(child.geometry, 15),
      new LineBasicMaterial({ color: '#2f6fc2' }),
    )
    outline.name = OUTLINE_NAME
    outline.scale.setScalar(1.012)
    child.add(outline)
  })
}

function buildNodeOwnerMap(mapping: ComponentNodeMap) {
  const owners = new WeakMap<Object3D, ComponentId>()
  Object.entries(mapping).forEach(([id, node]) => {
    node.traverse((child) => owners.set(child, id as ComponentId))
  })
  return owners
}

function CameraFocus({
  selectedId,
  focusRequestKey,
  mapping,
  model,
}: {
  selectedId: ComponentId | null
  focusRequestKey: number
  mapping: ComponentNodeMap
  model: Object3D
}) {
  const controls = useRef<OrbitControlsImpl>(null)
  const { camera } = useThree()
  const target = useMemo(() => new Vector3(), [])
  const cameraGoal = useMemo(() => new Vector3(), [])
  const focusing = useRef(selectedId !== null)

  useEffect(() => {
    if (!selectedId) {
      focusing.current = false
      return
    }
    const pose = calculateFocusPose(mapping[selectedId], model)
    target.copy(pose.target)
    cameraGoal.copy(pose.cameraPosition)
    focusing.current = true
  }, [cameraGoal, focusRequestKey, mapping, model, selectedId, target])

  useFrame((_, delta) => {
    if (!selectedId || !focusing.current) return
    const easing = 1 - Math.exp(-5 * delta)
    camera.position.lerp(cameraGoal, easing)
    controls.current?.target.lerp(target, easing)
    controls.current?.update()
    if (
      camera.position.distanceTo(cameraGoal) < 0.01
      && (!controls.current || controls.current.target.distanceTo(target) < 0.01)
    ) {
      focusing.current = false
    }
  })

  return <OrbitControls ref={controls} enablePan={false} minDistance={2.5} maxDistance={10} />
}

function MedicalDeviceModel({
  selectedId,
  focusRequestKey,
  onSelect,
}: DeviceViewerProps) {
  const { scene } = useGLTF(MODEL_URL)
  const model = useMemo(() => cloneModel(scene), [scene])
  const mapping = useMemo(() => buildComponentNodeMap(model), [model])
  const owners = useMemo(() => buildNodeOwnerMap(mapping), [mapping])

  useEffect(() => {
    clearSelectionOutlines(model)
    if (selectedId) addSelectionOutlines(mapping[selectedId])
    return () => clearSelectionOutlines(model)
  }, [mapping, model, selectedId])

  const selectMeshOwner = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    const id = owners.get(event.object)
    if (id) onSelect(id)
  }

  return (
    <>
      <primitive
        object={model}
        onClick={selectMeshOwner}
        onPointerOver={(event: ThreeEvent<PointerEvent>) => {
          if (!owners.get(event.object)) return
          event.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto'
        }}
      />
      <CameraFocus
        selectedId={selectedId}
        focusRequestKey={focusRequestKey}
        mapping={mapping}
        model={model}
      />
    </>
  )
}

class ModelErrorBoundary extends Component<
  { children: ReactNode },
  { message: string | null }
> {
  state = { message: null as string | null }

  static getDerivedStateFromError(error: Error) {
    return { message: error.message }
  }

  render() {
    if (this.state.message) {
      return (
        <div className="model-error" role="alert">
          <strong>Medical-device model unavailable</strong>
          <span>{this.state.message}</span>
        </div>
      )
    }
    return this.props.children
  }
}

export function DeviceViewer(props: DeviceViewerProps) {
  const isTestEnvironment = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)

  return (
    <section className="device-viewer" aria-label="Device model viewer">
      <ModelErrorBoundary>
        <div className="device-viewer__canvas" aria-hidden="true">
          {!isTestEnvironment && (
            <Canvas camera={{ position: [0, 0, 6.2], fov: 38 }} dpr={[1, 2]} shadows>
              <color attach="background" args={['#f4f5f4']} />
              <ambientLight intensity={1.2} />
              <directionalLight position={[4, 5, 4]} intensity={1.7} castShadow />
              <Suspense fallback={null}>
                <MedicalDeviceModel {...props} />
              </Suspense>
              <ContactShadows position={[0, -1.62, 0]} opacity={0.3} scale={7} blur={2.5} far={4} />
            </Canvas>
          )}
        </div>
      </ModelErrorBoundary>
      <div className="device-viewer__fallback" role="group" aria-label="Interactive infusion pump part controls">
        {(Object.entries(componentModelNames) as [ComponentId, string][]).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="device-viewer__part-control"
            aria-pressed={props.selectedId === id}
            onClick={() => props.onSelect(id)}
          >
            Select {label}
          </button>
        ))}
      </div>
    </section>
  )
}

useGLTF.preload(MODEL_URL)
