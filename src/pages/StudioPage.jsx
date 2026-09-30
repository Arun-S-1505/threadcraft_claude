import { useState, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import TShirt3D from '../components/TShirt3D'
import Navbar from '../components/Navbar'

/* ───────── Data ───────── */
const colorOptions = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Onyx Black', hex: '#1A1A1A' },
  { name: 'Slate Navy', hex: '#1E293B' },
  { name: 'Royal Blue', hex: '#0051d5' },
  { name: 'Silver Mist', hex: '#D1D5DB' },
]

const sizeOptions = ['S', 'M', 'L', 'XL', 'XXL']

const printOptions = [
  { label: 'Direct to Garment (DTG)', value: 'dtg' },
  { label: 'Screen Print', value: 'screen' },
  { label: 'Premium Embroidery', value: 'embroidery' },
]

const placementOptions = [
  { label: 'Front Chest', value: 'front', icon: 'indeterminate_check_box' },
  { label: 'Back', value: 'back', icon: 'flip' },
  { label: 'Left Sleeve', value: 'left_sleeve', icon: 'arrow_back' },
  { label: 'Right Sleeve', value: 'right_sleeve', icon: 'arrow_forward' },
]

/* ───────── Pricing ───────── */
const BASE_PRICES = { dtg: 45, screen: 38, embroidery: 55 }
const PRINT_FEES = { dtg: 12, screen: 8, embroidery: 18 }

/* ───────── Maximum Sublimation Bounds ───────── */
const MAX_SUBLIMATION = 0.55

/* ───────── Component ───────── */
export default function StudioPage() {
  // Tool state
  const [activeTab, setActiveTab] = useState('select')

  // Product state
  const [selectedColor, setSelectedColor] = useState(colorOptions[0])
  const [selectedSize, setSelectedSize] = useState('M')
  const [printType, setPrintType] = useState('dtg')

  // Placement & View state
  const [currentPlacement, setCurrentPlacement] = useState('front')
  const [viewAngle, setViewAngle] = useState('front')

  // Design state
  const [designText, setDesignText] = useState('')
  const [textFont, setTextFont] = useState('Geist')
  const [textColor, setTextColor] = useState('#FFFFFF')
  const [textSize, setTextSize] = useState(24)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [lockAspectRatio, setLockAspectRatio] = useState(false)

  // Multi-Design Items List
  const [designList, setDesignList] = useState([])
  const [activeDesignId, setActiveDesignId] = useState(null)

  // Refs
  const fileInputRef = useRef(null)

  // Pricing
  const basePrice = BASE_PRICES[printType]
  const hasDesign = designList.length > 0
  const totalPrice = basePrice + (hasDesign ? printFeeForCount(designList.length, printType) : 0)

  function printFeeForCount(count, type) {
    return PRINT_FEES[type] + Math.max(0, count - 1) * 5
  }

  // ─── Select View & Placement ───
  const handleViewAngleSwitch = (angle) => {
    setViewAngle(angle)
    setCurrentPlacement(angle)
  }

  // ─── Select Design Item for Editing ───
  const handleSelectDesign = (id) => {
    setActiveDesignId(id)
    const found = designList.find(d => d.id === id)
    if (found && found.placement) {
      setViewAngle(found.placement)
      setCurrentPlacement(found.placement)
    }
    setDesignList(prev => prev.map(d => d.id === id ? { ...d, isFixed: false } : d))
  }

  // ─── Add Text Design Item ───
  const handlePlaceText = () => {
    if (!designText.trim()) return
    const newId = 'des_txt_' + Date.now()
    const newItem = {
      id: newId,
      type: 'text',
      text: designText,
      textFont,
      textColor,
      textSize,
      placement: currentPlacement,
      pos: { x: 0, y: 0.04 },
      scale: { x: 0.35, y: 0.25 },
      isFixed: false,
      visible: true,
    }
    setDesignList(prev => [...prev, newItem])
    setActiveDesignId(newId)
    setDesignText('')
    setActiveTab('select')
  }

  // ─── Add Image Graphic Design Item ───
  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const newId = 'des_img_' + Date.now()
      const newItem = {
        id: newId,
        type: 'image',
        image: ev.target.result,
        name: file.name,
        placement: currentPlacement,
        pos: { x: 0, y: 0.04 },
        scale: { x: 0.35, y: 0.35 },
        isFixed: false,
        visible: true,
      }
      setDesignList(prev => [...prev, newItem])
      setActiveDesignId(newId)
      setActiveTab('select')
    }
    reader.readAsDataURL(file)
  }

  // ─── AI Generate Text / Graphic Item ───
  const handleAiGenerate = () => {
    if (!aiPrompt.trim()) return
    setAiGenerating(true)
    setTimeout(() => {
      const newId = 'des_ai_' + Date.now()
      const newItem = {
        id: newId,
        type: 'text',
        text: `[AI] ${aiPrompt.slice(0, 30)}`,
        textFont: 'Geist',
        textColor: '#0051d5',
        textSize: 26,
        placement: currentPlacement,
        pos: { x: 0, y: 0.04 },
        scale: { x: 0.35, y: 0.25 },
        isFixed: false,
        visible: true,
      }
      setDesignList(prev => [...prev, newItem])
      setActiveDesignId(newId)
      setAiPrompt('')
      setAiGenerating(false)
      setActiveTab('select')
    }, 1800)
  }

  // ─── Fix / Embed Design onto 3D Shirt & Allow Next Action ───
  const handleFixDesign = (id) => {
    setDesignList(prev => prev.map(d => d.id === id ? { ...d, isFixed: true } : d))
    setActiveDesignId(null)
  }

  // ─── Delete Design Element ───
  const handleDeleteDesign = (id) => {
    setDesignList(prev => prev.filter(d => d.id !== id))
    if (activeDesignId === id) {
      const remaining = designList.filter(d => d.id !== id)
      setActiveDesignId(remaining.length > 0 ? remaining[remaining.length - 1].id : null)
    }
  }

  // ─── Update Item Placement ───
  const handlePlacementChange = (newPlacement) => {
    if (!activeDesignId) return
    setCurrentPlacement(newPlacement)
    setViewAngle(newPlacement)
    setDesignList(prev => prev.map(d => d.id === activeDesignId ? { ...d, placement: newPlacement } : d))
  }

  // ─── Slider Handlers ───
  const handleScaleXChange = (val) => {
    if (!activeDesignId) return
    const num = Math.max(0.08, Math.min(MAX_SUBLIMATION, parseFloat(val)))
    setDesignList(prev => prev.map(d => {
      if (d.id !== activeDesignId) return d
      const currentY = typeof d.scale === 'object' ? d.scale.y : d.scale || 0.35
      return {
        ...d,
        scale: {
          x: num,
          y: lockAspectRatio ? num : currentY,
        },
      }
    }))
  }

  const handleScaleYChange = (val) => {
    if (!activeDesignId) return
    const num = Math.max(0.08, Math.min(MAX_SUBLIMATION, parseFloat(val)))
    setDesignList(prev => prev.map(d => {
      if (d.id !== activeDesignId) return d
      const currentX = typeof d.scale === 'object' ? d.scale.x : d.scale || 0.35
      return {
        ...d,
        scale: {
          x: lockAspectRatio ? num : currentX,
          y: num,
        },
      }
    }))
  }

  const handlePosXChange = (val) => {
    if (!activeDesignId) return
    const num = Math.max(-0.35, Math.min(0.35, parseFloat(val)))
    setDesignList(prev => prev.map(d => {
      if (d.id !== activeDesignId) return d
      return { ...d, pos: { ...d.pos, x: num } }
    }))
  }

  const handlePosYChange = (val) => {
    if (!activeDesignId) return
    const num = Math.max(-0.35, Math.min(0.35, parseFloat(val)))
    setDesignList(prev => prev.map(d => {
      if (d.id !== activeDesignId) return d
      return { ...d, pos: { ...d.pos, y: num } }
    }))
  }

  // Active item reference
  const activeItem = designList.find(d => d.id === activeDesignId)
  const activeScaleX = activeItem ? (typeof activeItem.scale === 'object' ? activeItem.scale.x : activeItem.scale || 0.35) : 0.35
  const activeScaleY = activeItem ? (typeof activeItem.scale === 'object' ? activeItem.scale.y : activeItem.scale || 0.35) : 0.35
  const activePosX = activeItem ? activeItem.pos?.x || 0 : 0
  const activePosY = activeItem ? activeItem.pos?.y || 0.04 : 0.04

  /* ─── Side toolbar tabs ─── */
  const sideTools = [
    { icon: 'near_me', label: 'Select', tab: 'select' },
    { icon: 'title', label: 'Text', tab: 'text' },
    { icon: 'category', label: 'Graphics', tab: 'graphics' },
    { icon: 'texture', label: 'Textures', tab: 'textures' },
    { icon: 'layers', label: 'Layers', tab: 'layers' },
  ]

  return (
    <div className="bg-background text-on-background font-body-md h-screen flex flex-col overflow-hidden select-none">
      {/* ═══════ Top Navbar (shared) ═══════ */}
      <Navbar />

      {/* ═══════ Main Workspace ═══════ */}
      <div className="flex flex-1 pt-20 h-full relative">
        {/* ─── Side Navigation Bar ─── */}
        <aside className="fixed left-0 top-20 h-[calc(100vh-80px)] flex flex-col items-center py-3 sm:py-stack-md gap-1 sm:gap-stack-xs bg-surface border-r border-outline-variant/20 shadow-md w-14 sm:w-20 md:w-24 z-40">
          <div className="flex flex-col items-center mb-2 sm:mb-stack-md">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-surface-container-highest overflow-hidden mb-1 sm:mb-2">
              <img alt="Current Design" className="w-full h-full object-cover" src="/logo-mark.png" />
            </div>
            <span className="font-label-sm text-[9px] sm:text-label-sm text-on-surface-variant text-center leading-tight">Draft v1.2</span>
          </div>
          <nav className="flex flex-col gap-1.5 sm:gap-2 w-full px-1 sm:px-2 items-center flex-1 font-label-sm text-label-sm">
            {sideTools.map(tool => (
              <button key={tool.tab} onClick={() => setActiveTab(tool.tab)}
                className={`flex flex-col items-center justify-center w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-xl transition-transform duration-300 ease-out active:scale-90 ${activeTab === tool.tab ? 'bg-primary text-on-primary shadow-sm' : tool.tab === 'textures' ? 'text-secondary-container hover:bg-surface-variant/50' : 'text-on-surface-variant hover:bg-surface-variant/50'}`}>
                <span className="material-symbols-outlined text-[18px] sm:text-[20px] mb-0.5 sm:mb-1">{tool.icon}</span>
                <span className="text-[9px] sm:text-[10px]">{tool.label}</span>
              </button>
            ))}
          </nav>
          <div className="flex flex-col gap-1 sm:gap-2 w-full px-1 sm:px-2 items-center mt-auto font-label-sm text-label-sm">
            <button className="flex flex-col items-center justify-center text-on-surface-variant w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 hover:bg-surface-variant/50 rounded-xl transition-all active:scale-90"><span className="material-symbols-outlined text-[18px] sm:text-[20px] mb-0.5 sm:mb-1">settings</span><span className="text-[9px] sm:text-[10px] hidden md:block">Settings</span></button>
            <button className="flex flex-col items-center justify-center text-on-surface-variant w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 hover:bg-surface-variant/50 rounded-xl transition-all active:scale-90"><span className="material-symbols-outlined text-[18px] sm:text-[20px] mb-0.5 sm:mb-1">help_outline</span><span className="text-[9px] sm:text-[10px] hidden md:block">Help</span></button>
          </div>
          <button className="mt-2 sm:mt-4 font-label-sm text-[9px] sm:text-label-sm bg-surface-container-highest text-on-surface px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-full hover:bg-surface-variant transition-colors w-11/12">Save</button>
        </aside>

        {/* ─── Main Area ─── */}
        <main className="flex-1 ml-14 sm:ml-20 md:ml-24 flex h-full">
          {/* ═══ Central Canvas ═══ */}
          <section className="flex-1 canvas-bg relative overflow-hidden">
            <div className="absolute inset-0">
              <TShirt3D
                color={selectedColor.hex}
                designList={designList}
                activeDesignId={activeDesignId}
                onSelectDesign={handleSelectDesign}
                viewAngle={viewAngle}
              />
            </div>

            {/* 3D Camera View Angle Quick Switcher Toolbar */}
            <div className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 glass-panel rounded-full p-1 sm:p-1.5 flex items-center gap-0.5 sm:gap-1 z-30 shadow-md max-w-[95vw] overflow-x-auto">
              {placementOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleViewAngleSwitch(opt.value)}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold transition-all whitespace-nowrap ${
                    viewAngle === opt.value
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-variant/50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px] sm:text-[16px]">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Floating Quick Slider Controller on 3D Viewport */}
            {activeItem && (
              <div className="absolute bottom-12 sm:bottom-16 right-2 sm:right-6 glass-panel rounded-2xl p-3 sm:p-4 w-[calc(100vw-4.5rem)] sm:w-72 max-w-[300px] sm:max-w-none shadow-xl z-30 border border-outline-variant/30 flex flex-col gap-2.5 sm:gap-3">
                <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                    <span className="material-symbols-outlined text-[16px]">tune</span>
                    Sliders: {activeItem.type === 'text' ? activeItem.text.slice(0, 10) : 'Graphic'}
                  </div>
                  <button onClick={() => handleDeleteDesign(activeItem.id)} className="text-rose-500 hover:text-rose-700 text-xs flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                </div>

                {/* Placement Switcher inside floating card */}
                <div className="space-y-1">
                  <span className="text-[11px] text-on-surface-variant block font-medium">Placement Area</span>
                  <div className="grid grid-cols-2 gap-1">
                    {placementOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handlePlacementChange(opt.value)}
                        className={`py-1 px-2 rounded text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                          (activeItem.placement || 'front') === opt.value
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-surface-variant/40 text-on-surface-variant hover:bg-surface-variant'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Width Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-on-surface-variant">
                    <span>Width</span>
                    <span className="font-mono font-bold text-primary">{Math.round((activeScaleX / 0.35) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.08"
                    max="0.55"
                    step="0.01"
                    value={activeScaleX}
                    onChange={e => handleScaleXChange(e.target.value)}
                    className="w-full accent-primary h-1.5 bg-surface-variant rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Height Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-on-surface-variant">
                    <span>Height</span>
                    <span className="font-mono font-bold text-primary">{Math.round((activeScaleY / 0.35) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.08"
                    max="0.55"
                    step="0.01"
                    value={activeScaleY}
                    onChange={e => handleScaleYChange(e.target.value)}
                    className="w-full accent-primary h-1.5 bg-surface-variant rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Move X Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-on-surface-variant">
                    <span>Move Left/Right</span>
                    <span className="font-mono font-bold text-primary">{Math.round(activePosX * 100)}</span>
                  </div>
                  <input
                    type="range"
                    min="-0.35"
                    max="0.35"
                    step="0.01"
                    value={activePosX}
                    onChange={e => handlePosXChange(e.target.value)}
                    className="w-full accent-primary h-1.5 bg-surface-variant rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Move Y Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-on-surface-variant">
                    <span>Move Up/Down</span>
                    <span className="font-mono font-bold text-primary">{Math.round(activePosY * 100)}</span>
                  </div>
                  <input
                    type="range"
                    min="-0.35"
                    max="0.35"
                    step="0.01"
                    value={activePosY}
                    onChange={e => handlePosYChange(e.target.value)}
                    className="w-full accent-primary h-1.5 bg-surface-variant rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <button
                  onClick={() => handleFixDesign(activeItem.id)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-sm transition-all mt-1"
                >
                  <span className="material-symbols-outlined text-[14px]">check</span> Embed & Add Next
                </button>
              </div>
            )}
          </section>

          {/* ═══ Right Control Panel ═══ */}
          <aside className="w-80 bg-surface border-l border-outline-variant/20 flex flex-col h-full z-20 shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.02)] hidden lg:flex">
            <div className="p-6 border-b border-outline-variant/20">
              <h2 className="font-headline-md text-[20px] font-semibold text-on-surface mb-1">Product Details</h2>
              <p className="font-body-md text-sm text-on-surface-variant">Classic Heavyweight Tee</p>
            </div>
            <div className="flex-1 overflow-y-auto control-scroll p-6 flex flex-col gap-8">

              {/* Garment Color */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-baseline">
                  <label className="font-label-md text-label-md text-on-surface uppercase tracking-wider text-[11px]">Garment Color</label>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{selectedColor.name}</span>
                </div>
                <div className="flex gap-3">
                  {colorOptions.map(color => (
                    <button key={color.hex} onClick={() => setSelectedColor(color)} className={`w-8 h-8 rounded-full border hover:scale-110 transition-transform shadow-sm ${selectedColor.hex === color.hex ? 'border-2 border-primary ring-2 ring-secondary ring-offset-2' : 'border-outline-variant/20'}`} style={{ backgroundColor: color.hex }} title={color.name}></button>
                  ))}
                </div>
              </div>

              {/* Print Technique */}
              <div className="flex flex-col gap-3">
                <label className="font-label-md text-label-md text-on-surface uppercase tracking-wider text-[11px]">Print Technique</label>
                <div className="relative">
                  <select value={printType} onChange={e => setPrintType(e.target.value)} className="w-full appearance-none bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-4 py-3 font-body-md text-sm text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-colors cursor-pointer">
                    {printOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[20px]">expand_more</span>
                </div>
              </div>

              {/* Size */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-baseline">
                  <label className="font-label-md text-label-md text-on-surface uppercase tracking-wider text-[11px]">Size</label>
                  <button className="font-label-sm text-label-sm text-secondary hover:underline">Size Guide</button>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {sizeOptions.map(size => (
                    <button key={size} onClick={() => setSelectedSize(size)} className={`py-2 rounded font-label-md text-label-md transition-colors ${selectedSize === size ? 'border-2 border-primary bg-primary/5 text-primary font-bold' : 'border border-outline-variant/50 text-on-surface hover:border-primary'}`}>{size}</button>
                  ))}
                </div>
              </div>

              {/* ACTIVE ELEMENT DIRECT SLIDERS */}
              {activeItem ? (
                <div className="flex flex-col gap-4 pt-4 border-t border-outline-variant/20 bg-surface-container-low p-4 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-xs text-primary font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-secondary">sliders</span>
                      Editing: {activeItem.type === 'text' ? 'Text' : 'Image'}
                    </span>
                    <button
                      onClick={() => setLockAspectRatio(!lockAspectRatio)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors ${lockAspectRatio ? 'bg-secondary text-on-secondary' : 'bg-outline-variant/30 text-on-surface-variant'}`}
                      title="Lock Aspect Ratio (1:1 Square Scale)"
                    >
                      <span className="material-symbols-outlined text-[12px]">{lockAspectRatio ? 'lock' : 'lock_open'}</span>
                      {lockAspectRatio ? 'Locked 1:1' : 'Free Ratio'}
                    </button>
                  </div>

                  {/* Placement Location Switcher */}
                  <div className="space-y-1">
                    <label className="text-xs text-on-surface font-medium block">Placement Location</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {placementOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handlePlacementChange(opt.value)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                            (activeItem.placement || 'front') === opt.value
                              ? 'bg-primary text-white shadow-sm'
                              : 'bg-surface-variant/40 text-on-surface-variant hover:bg-surface-variant'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">{opt.icon}</span>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Width Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-on-surface font-medium">
                      <span>Width Scale</span>
                      <span className="font-mono text-primary font-bold">{Math.round((activeScaleX / 0.35) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.08"
                      max="0.55"
                      step="0.01"
                      value={activeScaleX}
                      onChange={e => handleScaleXChange(e.target.value)}
                      className="w-full accent-primary h-2 bg-surface-variant rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Height Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-on-surface font-medium">
                      <span>Height Scale</span>
                      <span className="font-mono text-primary font-bold">{Math.round((activeScaleY / 0.35) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.08"
                      max="0.55"
                      step="0.01"
                      value={activeScaleY}
                      onChange={e => handleScaleYChange(e.target.value)}
                      className="w-full accent-primary h-2 bg-surface-variant rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Move Horizontal Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-on-surface font-medium">
                      <span>Position X (Left / Right)</span>
                      <span className="font-mono text-primary font-bold">{Math.round(activePosX * 100)}</span>
                    </div>
                    <input
                      type="range"
                      min="-0.35"
                      max="0.35"
                      step="0.01"
                      value={activePosX}
                      onChange={e => handlePosXChange(e.target.value)}
                      className="w-full accent-primary h-2 bg-surface-variant rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Move Vertical Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-on-surface font-medium">
                      <span>Position Y (Up / Down)</span>
                      <span className="font-mono text-primary font-bold">{Math.round(activePosY * 100)}</span>
                    </div>
                    <input
                      type="range"
                      min="-0.35"
                      max="0.35"
                      step="0.01"
                      value={activePosY}
                      onChange={e => handlePosYChange(e.target.value)}
                      className="w-full accent-primary h-2 bg-surface-variant rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleFixDesign(activeItem.id)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-sm transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span> Embed & Add Next
                    </button>
                    <button
                      onClick={() => handleDeleteDesign(activeItem.id)}
                      className="bg-rose-500 hover:bg-rose-600 text-white p-2 rounded-lg text-xs font-bold flex items-center justify-center shadow-sm transition-all"
                      title="Delete design"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 pt-4 border-t border-outline-variant/20 bg-emerald-50/60 border border-emerald-200/80 p-4 rounded-xl text-center">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-bold text-xs">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    Design Embedded onto 3D Shirt
                  </div>
                  <p className="text-[11px] text-emerald-700/90 leading-snug">
                    Select a placement area below to add your next text or graphic design.
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button onClick={() => setActiveTab('text')} className="bg-primary text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-sm hover:opacity-90 transition-all">
                      <span className="material-symbols-outlined text-[14px]">title</span> + Add Text
                    </button>
                    <button onClick={() => setActiveTab('graphics')} className="bg-secondary text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-sm hover:opacity-90 transition-all">
                      <span className="material-symbols-outlined text-[14px]">image</span> + Add Graphic
                    </button>
                  </div>
                </div>
              )}

              {/* Tab: Text */}
              {activeTab === 'text' && (
                <div className="flex flex-col gap-3 pt-4 border-t border-outline-variant/20">
                  <label className="font-label-md text-label-md text-on-surface uppercase tracking-wider text-[11px] flex items-center gap-2"><span className="material-symbols-outlined text-secondary text-[16px]">title</span> Add Text Box</label>

                  {/* Placement Location selector prior to adding */}
                  <div>
                    <label className="text-[10px] text-on-surface-variant uppercase block mb-1">Target Placement Area</label>
                    <div className="grid grid-cols-2 gap-1">
                      {placementOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setCurrentPlacement(opt.value)
                            setViewAngle(opt.value)
                          }}
                          className={`py-1.5 px-2 rounded text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                            currentPlacement === opt.value
                              ? 'bg-primary text-white shadow-sm'
                              : 'bg-surface-container-low text-on-surface-variant border border-outline-variant/30 hover:border-primary'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">{opt.icon}</span>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea value={designText} onChange={e => setDesignText(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3 font-body-md text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all resize-none" placeholder="Type text here..." rows={2} />
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[10px] text-on-surface-variant uppercase block mb-1">Font</label>
                      <select value={textFont} onChange={e => setTextFont(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-secondary transition-colors"><option value="Geist">Geist</option><option value="Inter">Inter</option><option value="serif">Serif</option><option value="monospace">Monospace</option></select></div>
                    <div><label className="text-[10px] text-on-surface-variant uppercase block mb-1">Size (px)</label>
                      <input type="number" value={textSize} onChange={e => setTextSize(Number(e.target.value))} min={10} max={72} className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-secondary transition-colors" /></div>
                  </div>
                  <div><label className="text-[10px] text-on-surface-variant uppercase block mb-1">Text Color</label>
                    <div className="flex gap-2 items-center">
                      {['#FFFFFF', '#000000', '#0051d5', '#DC2626', '#16A34A', '#F59E0B'].map(c => (
                        <button key={c} onClick={() => setTextColor(c)} className={`w-6 h-6 rounded-full border transition-transform hover:scale-110 ${textColor === c ? 'ring-2 ring-secondary ring-offset-1' : 'border-outline-variant/30'}`} style={{ backgroundColor: c }}></button>
                      ))}
                    </div>
                  </div>
                  <button onClick={handlePlaceText} disabled={!designText.trim()} className="w-full bg-secondary text-on-secondary py-2.5 rounded-lg font-label-md flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"><span className="material-symbols-outlined text-[16px]">add</span> Insert Text Box ({placementOptions.find(p => p.value === currentPlacement)?.label})</button>
                </div>
              )}

              {/* Tab: Graphics */}
              {activeTab === 'graphics' && (
                <div className="flex flex-col gap-3 pt-4 border-t border-outline-variant/20">
                  <label className="font-label-md text-label-md text-on-surface uppercase tracking-wider text-[11px] flex items-center gap-2"><span className="material-symbols-outlined text-secondary text-[16px]">category</span> Insert Image Graphic</label>
                  {/* Placement Area selector */}
                  <div>
                    <label className="text-[10px] text-on-surface-variant uppercase block mb-1">Target Placement Area</label>
                    <div className="grid grid-cols-2 gap-1">
                      {placementOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setCurrentPlacement(opt.value)
                            setViewAngle(opt.value)
                          }}
                          className={`py-1.5 px-2 rounded text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                            currentPlacement === opt.value
                              ? 'bg-primary text-white shadow-sm'
                              : 'bg-surface-container-low text-on-surface-variant border border-outline-variant/30 hover:border-primary'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">{opt.icon}</span>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-outline-variant/40 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-secondary/40 transition-colors cursor-pointer group">
                    <span className="material-symbols-outlined text-3xl text-on-surface-variant/40 mb-3 group-hover:text-secondary transition-colors">cloud_upload</span>
                    <p className="text-label-sm text-on-surface-variant">Click to <span className="text-secondary font-bold">upload image</span></p>
                    <p className="text-[10px] text-on-surface-variant/50 mt-2">Target: {placementOptions.find(p => p.value === currentPlacement)?.label}</p>
                  </div>
                </div>
              )}

              {/* Tab: Layers */}
              {activeTab === 'layers' && (
                <div className="flex flex-col gap-3 pt-4 border-t border-outline-variant/20">
                  <label className="font-label-md text-label-md text-on-surface uppercase tracking-wider text-[11px] flex items-center gap-2"><span className="material-symbols-outlined text-secondary text-[16px]">layers</span> Inserted Items ({designList.length})</label>
                  {designList.length === 0 ? (
                    <p className="text-xs text-on-surface-variant/60 italic py-2">No design elements added yet. Insert text or images to get started.</p>
                  ) : (
                    <div className="space-y-2">
                      {designList.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleSelectDesign(item.id)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all border ${
                            item.id === activeDesignId
                              ? 'bg-secondary/10 border-secondary'
                              : 'bg-surface-container-low border-outline-variant/20 hover:border-secondary/50'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="material-symbols-outlined text-[16px] text-secondary">
                              {item.type === 'text' ? 'title' : 'image'}
                            </span>
                            <div className="flex flex-col truncate">
                              <span className="text-label-sm truncate font-medium">
                                {item.type === 'text' ? item.text : (item.name || 'Image Graphic')}
                              </span>
                              <span className="text-[9px] text-on-surface-variant/70 uppercase font-bold">
                                {placementOptions.find(p => p.value === (item.placement || 'front'))?.label}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleFixDesign(item.id)
                              }}
                              className={`p-1 rounded-full transition-colors ${item.isFixed ? 'text-emerald-600 bg-emerald-100' : 'text-on-surface-variant/40 hover:text-emerald-600'}`}
                              title={item.isFixed ? 'Fixed onto 3D model' : 'Click to fix onto 3D model'}
                            >
                              <span className="material-symbols-outlined text-[16px]">check</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteDesign(item.id)
                              }}
                              className="p-1 text-on-surface-variant/40 hover:text-rose-600 transition-colors"
                              title="Delete design item"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* AI Design Assistant */}
              <div className="flex flex-col gap-3 mt-4 pt-6 border-t border-outline-variant/20">
                <label className="font-label-md text-label-md flex items-center gap-2 text-on-surface uppercase tracking-wider text-[11px]"><span className="material-symbols-outlined text-secondary-container text-[16px]">temp_preferences_custom</span> AI Design Assistant</label>
                <div className="relative group">
                  <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3 pr-12 font-body-md text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all resize-none" placeholder="Describe a graphic e.g. 'A minimalist geometric mountain range in neon blue...'" rows={3} />
                  <button onClick={handleAiGenerate} disabled={aiGenerating || !aiPrompt.trim()} className="absolute bottom-3 right-3 bg-secondary text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary-container transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"><span className="material-symbols-outlined text-[18px]">{aiGenerating ? 'hourglass_empty' : 'arrow_upward'}</span></button>
                </div>
                {aiGenerating && <p className="text-[11px] text-secondary animate-pulse">Generating your design...</p>}
              </div>

              {/* Pricing */}
              <div className="flex flex-col gap-3 pt-6 border-t border-outline-variant/20">
                <label className="font-label-md text-label-md text-on-surface uppercase tracking-wider text-[11px]">Pricing</label>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-on-surface-variant"><span>Base Garment</span><span className="text-primary font-medium">${basePrice}.00</span></div>
                  <div className="flex justify-between text-on-surface-variant"><span>Print Fee ({designList.length} items)</span><span className="text-primary font-medium">{hasDesign ? `$${printFeeForCount(designList.length, printType)}.00` : '—'}</span></div>
                  <div className="h-px bg-outline-variant/20 my-1"></div>
                  <div className="flex justify-between items-center"><span className="font-label-md text-primary">Total</span><span className="font-headline-md text-[24px] text-primary">${totalPrice}.00</span></div>
                </div>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  )
}
