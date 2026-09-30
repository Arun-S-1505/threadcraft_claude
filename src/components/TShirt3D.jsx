import React, { useRef, useState, useMemo, useEffect, useCallback, Component } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Decal, Center } from '@react-three/drei'
import * as THREE from 'three'
import { toOversized, makeOversizedGeometry } from './oversizedFit'

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
function createTextTexture(text, fontColor = '#FFFFFF', fontSize = 36, fontFamily = 'Geist') {
  if (!text) return null
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const fs = Math.max(32, Math.min(110, fontSize * 2.2))
  ctx.font = `bold ${fs}px ${fontFamily}, Inter, sans-serif`
  ctx.fillStyle = fontColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const maxWidth = canvas.width * 0.85
  const words = text.split(' ')
  const lines = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)

  const lineHeight = fs * 1.25
  const totalHeight = lines.length * lineHeight
  const startY = (canvas.height - totalHeight) / 2 + lineHeight / 2

  lines.forEach((line, idx) => {
    ctx.fillText(line, canvas.width / 2, startY + idx * lineHeight)
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

/* ───────── Helper to normalize scale {x, y} ───────── */
function getScaleXY(scale) {
  if (typeof scale === 'number') {
    return { x: scale, y: scale }
  }
  if (scale && typeof scale === 'object') {
    return { x: scale.x || 0.35, y: scale.y || 0.35 }
  }
  return { x: 0.35, y: 0.35 }
}

/* ───────── Calculate Decal Transform based on Placement ───────── */
function getPlacementTransform(placement, pos, scale, fit = 'regular') {
  const base = getBaseTransform(placement, pos, scale)
  if (fit !== 'oversized') return base
  // Same anchor point, moved through the oversized reshaping, with prints a little larger
  const sleeve = placement === 'left_sleeve' || placement === 'right_sleeve'
  const k = sleeve ? [1.1, 1.1, 1.1] : [1.2, 1.1, 1.1]
  return {
    position: toOversized(base.position),
    rotation: base.rotation,
    scale: [base.scale[0] * k[0], base.scale[1] * k[1], base.scale[2] * k[2]],
  }
}

function getBaseTransform(placement, pos, scale) {
  const p = placement || 'front'
  const x = pos?.x || 0
  const y = pos?.y || 0.04
  const sX = scale.x * 1.25
  const sY = scale.y * 1.25

  switch (p) {
    case 'back':
      return {
        position: [-x * 1.5, y * 1.5 - 0.02, -0.14],
        rotation: [0, Math.PI, 0],
        scale: [sX, sY, 0.15],
      }
    case 'left_sleeve':
      return {
        position: [-0.22 - y * 0.4, 0.08 + x * 0.4, 0.02],
        rotation: [0, -Math.PI / 2, 0],
        scale: [sX * 0.75, sY * 0.75, 0.15],
      }
    case 'right_sleeve':
      return {
        position: [0.22 + y * 0.4, 0.08 - x * 0.4, 0.02],
        rotation: [0, Math.PI / 2, 0],
        scale: [sX * 0.75, sY * 0.75, 0.15],
      }
    case 'front':
    default:
      return {
        position: [x * 1.5, y * 1.5 - 0.02, 0.14],
        rotation: [0, 0, 0],
        scale: [sX, sY, 0.15],
      }
  }
}

/* ───────── Single Decal Renderer for a Design Item ───────── */
function SingleDecal({ item, isActive, onSelect, fit }) {
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
  const transform = getPlacementTransform(item.placement, pos, scale, fit)

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
            isActive={item.id === activeDesignId}
            onSelect={onSelectDesign}
            fit={fit}
          />
        ))}
      </mesh>
    </group>
  )
}

/* ───────── Main 3D Studio Canvas ───────── */
export default function TShirt3D({
  color = '#FFFFFF',
  designList = [],
  activeDesignId = null,
  onSelectDesign,
  viewAngle = 'front',
  fit = 'regular',
}) {
  const controlsRef = useRef()

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

  return (
    <CanvasErrorBoundary>
      <div className="w-full h-full relative">
        <Canvas
          shadows={false}
          dpr={[1, 1.5]}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          camera={{ position: [0, 0, 10], fov: 35, near: 0.1, far: 1000 }}
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
