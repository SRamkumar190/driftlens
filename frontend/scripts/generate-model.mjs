import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Scene,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

globalThis.FileReader = class FileReader {
  result = null
  onloadend = null

  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result
      this.onloadend?.()
    })
  }

  readAsDataURL(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`
      this.onloadend?.()
    })
  }
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const outputPath = path.resolve(scriptDir, '../public/models/infusion-pump.glb')

function material(color, roughness = 0.48, metalness = 0.08) {
  return new MeshStandardMaterial({
    color: new Color(color),
    roughness,
    metalness,
  })
}

function roundedBox(parent, name, position, size, color, radius = 0.08) {
  const geometry = new RoundedBoxGeometry(size[0], size[1], size[2], 4, radius)
  const mesh = new Mesh(geometry, material(color))
  mesh.name = name
  mesh.position.set(...position)
  parent.add(mesh)
  return mesh
}

function cylinder(parent, name, position, radius, depth, color, rotation = [Math.PI / 2, 0, 0]) {
  const mesh = new Mesh(
    new CylinderGeometry(radius, radius, depth, 32),
    material(color, 0.4, 0.14),
  )
  mesh.name = name
  mesh.position.set(...position)
  mesh.rotation.set(...rotation)
  parent.add(mesh)
  return mesh
}

function namedGroup(scene, name) {
  const group = new Group()
  group.name = name
  scene.add(group)
  return group
}

const scene = new Scene()
scene.name = 'Infusion Pump Revision B'

// Neutral structural shell
roundedBox(scene, 'Outer Housing', [0, 0, 0], [3.2, 4.35, 0.88], '#e7e9e7', 0.22)
roundedBox(scene, 'Front Inset', [0, 0.15, 0.48], [2.78, 3.75, 0.10], '#f7f8f6', 0.14)
roundedBox(scene, 'Right Service Rail', [1.36, 0.1, 0.57], [0.28, 3.68, 0.18], '#43576a', 0.08)
roundedBox(scene, 'Lower Divider', [0, -1.12, 0.57], [2.7, 0.08, 0.12], '#b9c1c6', 0.025)

// Carry handle and feet
roundedBox(scene, 'Handle Top', [0, 2.56, 0], [1.7, 0.24, 0.42], '#d9ddde', 0.11)
roundedBox(scene, 'Handle Left', [-0.73, 2.32, 0], [0.24, 0.66, 0.42], '#d9ddde', 0.11)
roundedBox(scene, 'Handle Right', [0.73, 2.32, 0], [0.24, 0.66, 0.42], '#d9ddde', 0.11)
roundedBox(scene, 'Left Foot', [-1.05, -2.35, 0], [0.48, 0.28, 0.62], '#33485b', 0.07)
roundedBox(scene, 'Right Foot', [1.05, -2.35, 0], [0.48, 0.28, 0.62], '#33485b', 0.07)

// Screen and control surface remain neutral; reviewed component markers sit around them.
roundedBox(scene, 'Display Bezel', [0, 0.72, 0.61], [1.94, 1.55, 0.22], '#243746', 0.12)
roundedBox(scene, 'Display Glass', [0, 0.82, 0.74], [1.60, 1.08, 0.08], '#275e8c', 0.06)
roundedBox(scene, 'Display Readout', [0, 1.03, 0.79], [1.26, 0.10, 0.025], '#a6daf3', 0.02)
roundedBox(scene, 'Display Divider', [0, 0.72, 0.79], [1.25, 0.035, 0.025], '#7ab7db', 0.01)
roundedBox(scene, 'Keypad Plate', [0, -0.35, 0.61], [1.92, 0.60, 0.18], '#d3d8da', 0.09)

for (const [index, x] of [-0.62, -0.20, 0.20, 0.62].entries()) {
  cylinder(scene, `Keypad Button ${index + 1}`, [x, -0.27, 0.76], 0.13, 0.08, '#5d7183')
}
roundedBox(scene, 'Start Button', [-0.43, -0.62, 0.75], [0.42, 0.24, 0.08], '#4b9568', 0.07)
roundedBox(scene, 'Stop Button', [0.43, -0.62, 0.75], [0.42, 0.24, 0.08], '#b94e48', 0.07)

// Main controller: compact processor module, not the whole display.
const mainController = namedGroup(scene, 'Main Controller')
roundedBox(mainController, 'Controller Board', [-1.12, 1.47, 0.69], [0.52, 0.42, 0.18], '#687583', 0.055)
roundedBox(mainController, 'Controller Chip', [-1.12, 1.47, 0.80], [0.26, 0.23, 0.06], '#343f49', 0.035)
for (const offset of [-0.19, -0.06, 0.06, 0.19]) {
  roundedBox(mainController, `Controller Pin ${offset}`, [-1.12 + offset, 1.47, 0.79], [0.025, 0.34, 0.025], '#9ca5ab', 0.005)
}

// Pump motor: a visible rotary drive on the left edge of the fluid path.
const pumpMotor = namedGroup(scene, 'Pump Motor')
cylinder(pumpMotor, 'Motor Drum', [-1.22, -0.25, 0.70], 0.34, 0.20, '#657482')
cylinder(pumpMotor, 'Motor Hub', [-1.22, -0.25, 0.83], 0.14, 0.08, '#303d47')

// Battery module: front-accessible lower pack.
const battery = namedGroup(scene, 'Battery Module')
roundedBox(battery, 'Battery Bay', [0, -1.67, 0.63], [1.72, 0.80, 0.22], '#657482', 0.12)
roundedBox(battery, 'Battery Cell', [0, -1.67, 0.77], [1.35, 0.49, 0.08], '#465562', 0.08)
roundedBox(battery, 'Battery Charge Mark', [0, -1.67, 0.83], [0.20, 0.30, 0.025], '#dce4e2', 0.035)

// External tubing and two inline sensing modules.
const tubeCurve = new CatmullRomCurve3([
  new Vector3(1.55, 1.65, 0.20),
  new Vector3(1.88, 1.25, 0.32),
  new Vector3(1.82, 0.55, 0.40),
  new Vector3(1.82, -0.45, 0.40),
  new Vector3(1.72, -1.35, 0.25),
  new Vector3(1.34, -2.05, 0.10),
])
const tube = new Mesh(new TubeGeometry(tubeCurve, 64, 0.045, 12, false), material('#d7dee0', 0.3, 0.02))
tube.name = 'Infusion Tube'
scene.add(tube)

const flowSensor = namedGroup(scene, 'Flow Sensor')
roundedBox(flowSensor, 'Flow Sensor Body', [1.82, 0.66, 0.46], [0.40, 0.88, 0.30], '#657482', 0.14)
cylinder(flowSensor, 'Flow Sensor Window', [1.82, 0.66, 0.65], 0.12, 0.06, '#a6b0b8')

const occlusionSensor = namedGroup(scene, 'Occlusion Sensor')
cylinder(occlusionSensor, 'Occlusion Clamp', [1.80, -0.62, 0.46], 0.23, 0.30, '#657482', [0, 0, Math.PI / 2])
roundedBox(occlusionSensor, 'Occlusion Contact', [1.80, -0.62, 0.69], [0.25, 0.22, 0.08], '#949da4', 0.05)

// Small top connector to make the medical-device silhouette unmistakable.
const connector = new Mesh(new TorusGeometry(0.18, 0.055, 10, 32), material('#9da7ad', 0.35, 0.16))
connector.name = 'Tube Connector'
connector.position.set(1.58, 1.72, 0.22)
connector.rotation.x = Math.PI / 2
scene.add(connector)

const exporter = new GLTFExporter()
const glb = await exporter.parseAsync(scene, { binary: true })

await fs.mkdir(path.dirname(outputPath), { recursive: true })
await fs.writeFile(outputPath, new Uint8Array(glb))
console.log(`Wrote ${outputPath}`)
