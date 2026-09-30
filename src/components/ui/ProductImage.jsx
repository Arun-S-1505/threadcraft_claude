import Garment from './Garment'

/**
 * Product "photo" stage. Renders the front view and (optionally) crossfades to the back view on hover.
 * Replace the <Garment/> calls with <img/> once real product photography exists.
 */
export default function ProductImage({ product, color, hoverBack = false, view = 'front', className = '' }) {
  const hex = color || product.colors[0].hex
  return (
    <div className={`tc-stage ${className}`}>
      <div className="tc-stage__layer tc-stage__front">
        <Garment type={product.type} color={hex} art={product.art} view={view} title={`${product.name} in ${product.colors.find((c) => c.hex === hex)?.name ?? ''}`} />
      </div>
      {hoverBack && (
        <div className="tc-stage__layer tc-stage__back">
          <Garment type={product.type} color={hex} art={product.art} view="back" />
        </div>
      )}
    </div>
  )
}
