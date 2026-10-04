import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import TShirt3D from '../components/TShirt3D'
import Navbar from '../components/Navbar'
import Icon from '../components/ui/Icon'
import OrderDialog from '../components/OrderDialog'
import { formatPrice } from '../data/products'
import { BASE_PRICES, FIT_PRICE, printFee, unitPrice, ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, MAX_ITEMS, PRINT_LABEL } from '../../shared/designSpec'

/* ───────── Data ───────── */
const colorOptions = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Onyx Black', hex: '#1A1A1A' },
  { name: 'Slate Navy', hex: '#1E293B' },
  { name: 'Royal Blue', hex: '#0051d5' },
  { name: 'Silver Mist', hex: '#D1D5DB' },
]

const fitOptions = [
  { value: 'regular', label: 'Regular fit', gsm: 180, name: 'Regular Fit Tee' },
  { value: 'oversized', label: 'Oversized', gsm: 240, name: 'Oversized Tee' },
]

const sizeOptions = ['S', 'M', 'L', 'XL', 'XXL']

const placementOptions = [
  { label: 'Front Chest', value: 'front', icon: 'indeterminate_check_box' },
  { label: 'Back', value: 'back', icon: 'flip' },
  { label: 'Left Sleeve', value: 'left_sleeve', icon: 'arrow_back' },
  { label: 'Right Sleeve', value: 'right_sleeve', icon: 'arrow_forward' },
]

/* ───────── Maximum Sublimation Bounds ───────── */
const MAX_SUBLIMATION = 0.55

const PlacementPicker = ({ value, onPick }) => (
  <div className="sx-seg sx-seg--wrap" role="group" aria-label="Placement area">
    {placementOptions.map((opt) => (
      <button key={opt.value} type="button" className={value === opt.value ? 'is-on' : ''} aria-pressed={value === opt.value} onClick={() => onPick(opt.value)}>
        {opt.label}
      </button>
    ))}
  </div>
)

const Slider = ({ label, value, shown, min, max, onChange }) => (
  <div className="sx-slider">
    <div>
      <label>{label}</label>
      <span>{shown}</span>
    </div>
    <input type="range" min={min} max={max} step="0.01" value={value} onChange={(e) => onChange(e.target.value)} />
  </div>
)


/* ───────── Component ───────── */
export default function StudioPage() {
  useEffect(() => { document.title = 'Custom studio | ThreadCraft' }, [])
  // Tool state
  const [activeTab, setActiveTab] = useState('select')

  // Product state
  const [selectedColor, setSelectedColor] = useState(colorOptions[0])
  const [fit, setFit] = useState('regular')
  const [selectedSize, setSelectedSize] = useState('M')
  const printType = 'dtf' // the only print method we offer

  // Placement & View state
  const [currentPlacement, setCurrentPlacement] = useState('front')
  const [viewAngle, setViewAngle] = useState('front')

  // Design state
  const [designText, setDesignText] = useState('')
  const [textFont, setTextFont] = useState('Geist')
  const [textColor, setTextColor] = useState('#FFFFFF')
  const [textSize, setTextSize] = useState(24)
  const [lockAspectRatio, setLockAspectRatio] = useState(false)

  // Multi-Design Items List
  const [designList, setDesignList] = useState([])
  const [activeDesignId, setActiveDesignId] = useState(null)

  // Order flow
  const [orderOpen, setOrderOpen] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const captureRef = useRef(null)
  const handleCaptureReady = useCallback((fn) => { captureRef.current = fn }, [])

  // Refs
  const fileInputRef = useRef(null)
  const designSecRef = useRef(null)

  // On phones, bring the adjust controls into view when a design is added or picked
  // (the 3D shirt stays pinned above, so the change is visible while sliding).
  useEffect(() => {
    if (!activeDesignId || !window.matchMedia('(max-width: 960px)').matches) return
    const t = setTimeout(() => designSecRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
    return () => clearTimeout(t)
  }, [activeDesignId])

  // Pricing
  const basePrice = BASE_PRICES[printType] + FIT_PRICE[fit]
  const fitInfo = fitOptions.find((f) => f.value === fit)
  const hasDesign = designList.length > 0
  const printFeeTotal = printFee(designList.length, printType)
  const totalPrice = unitPrice({ fit, printType, itemCount: designList.length })

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
    e.target.value = ''
    if (!file) return
    setUploadError('')
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return setUploadError('Use a PNG, JPG, WebP or SVG file.')
    if (file.size > MAX_UPLOAD_BYTES) return setUploadError(`That file is too large. Maximum size is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`)
    if (designList.length >= MAX_ITEMS) return setUploadError(`You can add up to ${MAX_ITEMS} designs.`)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result
      // Read pixel size so we can warn about low-resolution artwork (SVG is scalable, so skipped)
      const probe = new Image()
      probe.onload = () => {
        const isSvg = file.type === 'image/svg+xml'
        const newId = 'des_img_' + Date.now()
        const newItem = {
          id: newId,
          type: 'image',
          image: dataUrl,
          file, // original bytes, uploaded untouched at order time
          mime: file.type,
          name: file.name,
          width: isSvg ? null : probe.naturalWidth,
          height: isSvg ? null : probe.naturalHeight,
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
      probe.onerror = () => setUploadError('That image could not be read. Try another file.')
      probe.src = dataUrl
    }
    reader.readAsDataURL(file)
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

  const placementLabel = (v) => placementOptions.find((p) => p.value === v)?.label
  const selectFromCanvas = (id) => {
    handleSelectDesign(id)
    setActiveTab('select')
  }
  const selectFromLayers = (id) => {
    handleSelectDesign(id)
    setActiveTab('select')
  }

  const tabs = [
    { key: 'select', label: 'Adjust' },
    { key: 'text', label: 'Text' },
    { key: 'graphics', label: 'Image' },
    { key: 'layers', label: `Layers (${designList.length})` },
  ]

  return (
    <div className="sx">
      <Navbar announcement />

      <div className="sx__body">
        {/* ═══ Canvas ═══ */}
        <section className="sx__stage" aria-label="3D preview">
          <div className="sx__views" role="group" aria-label="View">
            {placementOptions.map((opt) => (
              <button key={opt.value} type="button" className={viewAngle === opt.value ? 'is-on' : ''} aria-pressed={viewAngle === opt.value} onClick={() => handleViewAngleSwitch(opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>
          <div className="sx__canvas">
            <TShirt3D color={selectedColor.hex} designList={designList} activeDesignId={activeDesignId} onSelectDesign={selectFromCanvas} viewAngle={viewAngle} fit={fit} onCaptureReady={handleCaptureReady} />
          </div>
        </section>

        {/* ═══ Panel ═══ */}
        <aside className="sx__panel" aria-label="Design controls">
          <div className="sx__scroll">
            <header className="sx__head">
              <p className="tc-eyebrow">Custom studio</p>
              <h1>{fitInfo.name}</h1>
              <p>{fitInfo.gsm} GSM cotton. Design it, preview it in 3D, and see the price update as you go.</p>
            </header>

            {/* 1. Garment */}
            <section className="sx__sec">
              <h2><span>1</span> Garment</h2>

              <div className="sx__field">
                <div className="sx__label"><label>Fit</label><em>{fitInfo.gsm} GSM</em></div>
                <div className="sx-seg" role="group" aria-label="Fit">
                  {fitOptions.map((f) => (
                    <button key={f.value} type="button" className={fit === f.value ? 'is-on' : ''} aria-pressed={fit === f.value} onClick={() => setFit(f.value)}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sx__field">
                <div className="sx__label"><label>Colour</label><em>{selectedColor.name}</em></div>
                <div className="tc-swatches tc-swatches--wrap">
                  {colorOptions.map((color) => (
                    <button key={color.hex} type="button" className={`tc-swatch tc-swatch--lg ${selectedColor.hex === color.hex ? 'is-active' : ''}`} style={{ '--sw': color.hex }} onClick={() => setSelectedColor(color)} title={color.name} aria-label={color.name} aria-pressed={selectedColor.hex === color.hex} />
                  ))}
                </div>
              </div>

              <div className="sx__field">
                <div className="sx__label"><label>Size</label></div>
                <div className="tc-sizes">
                  {sizeOptions.map((size) => (
                    <button key={size} type="button" className={`tc-size ${selectedSize === size ? 'is-on' : ''}`} aria-pressed={selectedSize === size} onClick={() => setSelectedSize(size)}>
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sx__field">
                <div className="sx__label"><label>Print method</label><em>{PRINT_LABEL[printType]}</em></div>
                <p className="sx__muted">Full-colour artwork, printed to order.</p>
              </div>
            </section>

            {/* 2. Design */}
            <section className="sx__sec" ref={designSecRef}>
              <h2><span>2</span> Design</h2>
              <div className="sx__tabs" role="tablist">
                {tabs.map((t) => (
                  <button key={t.key} role="tab" aria-selected={activeTab === t.key} className={activeTab === t.key ? 'is-on' : ''} onClick={() => setActiveTab(t.key)}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Adjust */}
              {activeTab === 'select' &&
                (activeItem ? (
                  <div className="sx__tab">
                    <div className="sx__editing">
                      <p>
                        Editing <strong>{activeItem.type === 'text' ? `“${activeItem.text.slice(0, 22)}”` : activeItem.name || 'Image'}</strong>
                      </p>
                      <button type="button" className={`sx__lock ${lockAspectRatio ? 'is-on' : ''}`} aria-pressed={lockAspectRatio} onClick={() => setLockAspectRatio(!lockAspectRatio)}>
                        {lockAspectRatio ? 'Ratio locked' : 'Lock ratio'}
                      </button>
                    </div>

                    <div className="sx__field">
                      <div className="sx__label"><label>Placement</label></div>
                      <PlacementPicker value={activeItem.placement || 'front'} onPick={handlePlacementChange} />
                    </div>

                    <Slider label="Width" value={activeScaleX} shown={`${Math.round((activeScaleX / 0.35) * 100)}%`} min="0.08" max="0.55" onChange={handleScaleXChange} />
                    <Slider label="Height" value={activeScaleY} shown={`${Math.round((activeScaleY / 0.35) * 100)}%`} min="0.08" max="0.55" onChange={handleScaleYChange} />
                    <Slider label="Move left / right" value={activePosX} shown={Math.round(activePosX * 100)} min="-0.35" max="0.35" onChange={handlePosXChange} />
                    <Slider label="Move up / down" value={activePosY} shown={Math.round(activePosY * 100)} min="-0.35" max="0.35" onChange={handlePosYChange} />

                    <div className="sx__actions">
                      <button type="button" className="tc-btn tc-btn--primary tc-btn--sm" onClick={() => handleFixDesign(activeItem.id)}>
                        Done, add next
                      </button>
                      <button type="button" className="tc-btn tc-btn--ghost tc-btn--sm" onClick={() => handleDeleteDesign(activeItem.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="sx__tab sx__empty">
                    <p>{hasDesign ? 'Your design is placed on the garment. Pick a layer to adjust it, or add something new.' : 'Nothing on the garment yet. Add some text or upload an image to begin.'}</p>
                    <div className="sx__actions">
                      <button type="button" className="tc-btn tc-btn--primary tc-btn--sm" onClick={() => setActiveTab('text')}>Add text</button>
                      <button type="button" className="tc-btn tc-btn--ghost tc-btn--sm" onClick={() => setActiveTab('graphics')}>Add image</button>
                    </div>
                  </div>
                ))}

              {/* Text */}
              {activeTab === 'text' && (
                <div className="sx__tab">
                  <div className="sx__field">
                    <div className="sx__label"><label>Place on</label></div>
                    <PlacementPicker value={currentPlacement} onPick={handleViewAngleSwitch} />
                  </div>
                  <div className="sx__field">
                    <div className="sx__label"><label htmlFor="sx-text">Your text</label></div>
                    <textarea id="sx-text" className="tc-input" value={designText} onChange={(e) => setDesignText(e.target.value)} placeholder="Type something…" rows={2} />
                  </div>
                  <div className="sx__two">
                    <div className="sx__field">
                      <div className="sx__label"><label htmlFor="sx-font">Font</label></div>
                      <div className="tc-select tc-select--field">
                        <select id="sx-font" value={textFont} onChange={(e) => setTextFont(e.target.value)}>
                          <option value="Geist">Geist</option>
                          <option value="Inter">Inter</option>
                          <option value="serif">Serif</option>
                          <option value="monospace">Monospace</option>
                        </select>
                        <Icon name="chevron-down" size={16} />
                      </div>
                    </div>
                    <div className="sx__field">
                      <div className="sx__label"><label htmlFor="sx-size">Size (px)</label></div>
                      <input id="sx-size" type="number" className="tc-input" value={textSize} onChange={(e) => setTextSize(Number(e.target.value))} min={10} max={72} />
                    </div>
                  </div>
                  <div className="sx__field">
                    <div className="sx__label"><label>Text colour</label></div>
                    <div className="tc-swatches">
                      {['#FFFFFF', '#000000', '#0051d5', '#DC2626', '#16A34A', '#F59E0B'].map((c) => (
                        <button key={c} type="button" className={`tc-swatch ${textColor === c ? 'is-active' : ''}`} style={{ '--sw': c }} aria-label={c} aria-pressed={textColor === c} onClick={() => setTextColor(c)} />
                      ))}
                    </div>
                  </div>
                  <button type="button" className="tc-btn tc-btn--primary tc-btn--block" onClick={handlePlaceText} disabled={!designText.trim()}>
                    Add text to {placementLabel(currentPlacement)?.toLowerCase()}
                  </button>
                </div>
              )}

              {/* Image */}
              {activeTab === 'graphics' && (
                <div className="sx__tab">
                  <div className="sx__field">
                    <div className="sx__label"><label>Place on</label></div>
                    <PlacementPicker value={currentPlacement} onPick={handleViewAngleSwitch} />
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleFileUpload} className="sx__file" aria-label="Upload image" />
                  <button type="button" className="sx__drop" onClick={() => fileInputRef.current?.click()}>
                    <Icon name="upload" size={22} />
                    <span>Upload an image</span>
                    <small>PNG with a transparent background works best, at least 1000 px on the longest side. Max 8 MB. Placing on {placementLabel(currentPlacement)?.toLowerCase()}.</small>
                  </button>
                  {uploadError && <p className="tc-error" role="alert">{uploadError}</p>}
                </div>
              )}

              {/* Layers */}
              {activeTab === 'layers' && (
                <div className="sx__tab">
                  {designList.length === 0 ? (
                    <p className="sx__muted">No design elements yet. Add text or an image to get started.</p>
                  ) : (
                    <ul className="sx__layers">
                      {designList.map((item) => (
                        <li key={item.id} className={item.id === activeDesignId ? 'is-on' : ''}>
                          <button type="button" className="sx__layer" onClick={() => selectFromLayers(item.id)}>
                            <strong>{item.type === 'text' ? item.text : item.name || 'Image'}</strong>
                            <small>
                              {item.type === 'text' ? 'Text' : 'Image'} · {placementLabel(item.placement || 'front')}
                              {item.isFixed ? ' · placed' : ''}
                            </small>
                          </button>
                          <button type="button" className="sx__iconbtn" onClick={() => handleDeleteDesign(item.id)} aria-label={`Remove ${item.type === 'text' ? item.text : 'image'}`} title="Remove">
                            <Icon name="trash" size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* Summary */}
          <footer className="sx__foot">
            <dl>
              <div><dt>{fitInfo.label} tee ({selectedSize})</dt><dd>{formatPrice(basePrice)}</dd></div>
              <div><dt>Print ({designList.length} {designList.length === 1 ? 'item' : 'items'})</dt><dd>{hasDesign ? formatPrice(printFeeTotal) : '—'}</dd></div>
              <div className="sx__total"><dt>Total</dt><dd>{formatPrice(totalPrice)}</dd></div>
            </dl>
            <button type="button" className="tc-btn tc-btn--primary tc-btn--block sx__submit" disabled={!hasDesign} onClick={() => setOrderOpen(true)}>
              {hasDesign ? 'Submit order' : 'Add a design to order'}
            </button>
            <p>
              Ordering 20 or more? See <Link to="/bulk-orders" className="tc-link">bulk orders</Link>.
            </p>
          </footer>
        </aside>
      </div>

      {orderOpen && (
        <OrderDialog
          order={{ fit, colour: selectedColor, size: selectedSize, printType, designList }}
          getCapture={() => captureRef.current}
          onClose={() => setOrderOpen(false)}
        />
      )}
    </div>
  )
}
