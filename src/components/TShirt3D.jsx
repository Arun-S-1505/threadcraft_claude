import React, { useRef, useMemo, useEffect, Component } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Decal, Center } from '@react-three/drei'
import * as THREE from 'three'
import { makeOversizedGeometry } from './oversizedFit'
import { drawTextCanvas } from './textRaster'
import { getScaleXY, getPlacementTransform } from './decalTransform'

/* ───────── Preload 3D Model ───────── */
useGLTF.preload('/shirt_baked.glb')

/* ───────── React Error Boundary for 3D Canvas ───────── */
class CanvasErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error, info) {
    console.error('3D Canvas Error:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="sx__fallback">
          <p>3D preview unavailable</p>
          <small>Your browser could not start WebGL. You can still choose colours and options from the panel.</small>
        </div>
      )
    }
    return this.props.children
  }
}

/* ───────── Canvas Texture Generator for Text Decals ───────── */
function createTextTexture(text, fontColor, fontSize, fontFamily) {
  const canvas = drawTextCanvas(text, fontColor, fontSize, fontFamily)
  if (!canvas) return null
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

/* ───────── Single Decal Renderer for a Design Item ───────── */
function SingleDecal({ item, onSelect, fit }) {
  const textTexture = useMemo(() => {
    if (item.type === 'text' && item.text) {
      return createTextTexture(item.text, item.textColor, item.textSize, item.textFont)
    }
    return null
  }, [item.type, item.text, item.textColor, item.textSize, item.textFont])

  const imageTexture = useMemo(() => {
    if (item.type === 'image' && item.image) {
      const tex = new THREE.TextureLoader().load(item.image)
      tex.colorSpace = THREE.SRGBColorSpace
      return tex
    }
    return null
  }, [item.type, item.image])

  const activeTexture = imageTexture || textTexture
  if (!activeTexture) return null

  const pos = item.pos || { x: 0, y: 0.04 }
  const scale = getScaleXY(item.scale)
  // Saved orders carry the transform frozen at order time; live designs compute it from the sliders
  const transform = item.resolved || getPlacementTransform(item.placement, pos, scale, fit)

  return (
    <Decal
      position={transform.position}
      rotation={transform.rotation}
      scale={transform.scale}
      map={activeTexture}
      depthTest={true}
      depthWrite={false}
      onClick={(e) => {
        e.stopPropagation()
        if (onSelect) onSelect(item.id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    />
  )
}

/* ───────── 3D Shirt Model with Solid Material & Multi-Decals ───────── */
function Model({ color, designList = [], activeDesignId, onSelectDesign, fit = 'regular' }) {
  const { nodes } = useGLTF('/shirt_baked.glb')
  const geometry = useMemo(
    () => (fit === 'oversized' ? makeOversizedGeometry(nodes.T_Shirt_male.geometry) : nodes.T_Shirt_male.geometry),
    [fit, nodes]
  )

  const materialRef = useRef()
  const targetColor = useMemo(() => new THREE.Color(color), [color])

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.color.lerp(targetColor, Math.min(1, delta * 8))
    }
  })

  return (
    <group scale={10} position={[0, -0.2, 0]}>
      <mesh key={fit} geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          ref={materialRef}
          color={color}
          roughness={0.55}
          metalness={0.05}
          side={THREE.DoubleSide}
          depthWrite={true}
          depthTest={true}
        />

        {/* Render all design decals directly on the 3D model */}
        {designList.map((item) => (
          <SingleDecal
            key={item.id}
            item={item}
            onSelect={onSelectDesign}
            fit={fit}
          />
        ))}
      </mesh>
    </group>
  )
}

/* ───────── Snapshot capture (frozen visual proof for orders) ───────── */
const VIEW_AZIMUTH = { front: 0, back: Math.PI, left_sleeve: -Math.PI / 2, right_sleeve: Math.PI / 2 }

const nextFrames = (n) => new Promise((resolve) => {
  const tick = () => (--n <= 0 ? resolve() : requestAnimationFrame(tick))
  requestAnimationFrame(tick)
})

/**
 * Returns capture(views) -> { [view]: Blob }. Turns the orbit controls to each side, waits for the
 * render loop to draw it, and reads the canvas (the canvas keeps its buffer: preserveDrawingBuffer).
 */
function makeCapture(controlsRef, wrapRef) {
  return async (views) => {
    const controls = controlsRef.current
    const canvas = wrapRef.current?.querySelector('canvas')
    if (!controls || !canvas) throw new Error('The 3D preview is not ready yet. Please try again.')
    const restore = controls.getAzimuthalAngle()
    const damping = controls.enableDamping
    controls.enableDamping = false // snap straight to each angle instead of easing there
    const out = {}
    for (const view of views) {
      controls.setAzimuthalAngle(VIEW_AZIMUTH[view] ?? 0)
      controls.update()
      await nextFrames(4)
      const blob = await new Promise((resolve) => {
        canvas.toBlob((b) => (b ? resolve(b) : canvas.toBlob(resolve, 'image/png')), 'image/webp', 0.9)
      })
      if (!blob) throw new Error('Could not capture a preview of your design. Please try again.')
      out[view] = blob
    }
    controls.setAzimuthalAngle(restore)
    controls.update()
    controls.enableDamping = damping
    return out
  }
}

/* ───────── Main 3D Studio Canvas ───────── */
export default function TShirt3D({
  color = '#FFFFFF',
  designList = [],
  activeDesignId = null,
  onSelectDesign,
  viewAngle = 'front',
  fit = 'regular',
  onCaptureReady,
}) {
  const controlsRef = useRef()
  const wrapRef = useRef(null)

  // Smoothly rotate camera view when viewAngle changes
  useEffect(() => {
    if (!controlsRef.current) return
    const controls = controlsRef.current
    let targetAzimuth = 0
    if (viewAngle === 'back') targetAzimuth = Math.PI
    else if (viewAngle === 'left_sleeve') targetAzimuth = -Math.PI / 2
    else if (viewAngle === 'right_sleeve') targetAzimuth = Math.PI / 2
    else targetAzimuth = 0 // front

    controls.setAzimuthalAngle(targetAzimuth)
    controls.update()
  }, [viewAngle])

  useEffect(() => {
    onCaptureReady?.(makeCapture(controlsRef, wrapRef))
    return () => onCaptureReady?.(null)
  }, [onCaptureReady])

  return (
    <CanvasErrorBoundary>
      <div style={{ width: '100%', height: '100%', position: 'relative' }} ref={wrapRef}>
        <Canvas
          shadows={false}
          dpr={[1, 1.5]}
          gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
          camera={{ position: [0, 0, 15], fov: 35, near: 0.1, far: 1000 }}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={0.9} />
          <directionalLight position={[5, 10, 7]} intensity={1.4} />
          <directionalLight position={[-5, 5, -5]} intensity={0.5} />
          <pointLight position={[0, -2, 5]} intensity={0.3} />

          <React.Suspense fallback={null}>
            <Center key={fit}>
              <Model
                fit={fit}
                color={color}
                designList={designList}
                activeDesignId={activeDesignId}
                onSelectDesign={onSelectDesign}
              />
            </Center>
          </React.Suspense>

          {/* Full 360 Degree Orbit Controls */}
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableZoom={true}
            enableRotate={true}
            minDistance={3}
            maxDistance={60}
            minPolarAngle={Math.PI * 0.15}
            maxPolarAngle={Math.PI * 0.85}
            rotateSpeed={0.8}
            makeDefault
          />
        </Canvas>

        {/* Status Hint Footer */}
        <p className="sx__hint">Click a design to edit it. Use the view buttons to turn the garment.</p>
      </div>
    </CanvasErrorBoundary>
  )
}
