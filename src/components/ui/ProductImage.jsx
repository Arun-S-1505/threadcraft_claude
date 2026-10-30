import { photoUrl } from '../../data/products'

/**
 * Product photo stage for cards: the main photo, crossfading to the second photo on hover.
 * `view` picks a specific photo (used by the product page gallery).
 */
export default function ProductImage({ product, hoverBack = false, view, hanger = false, className = '' }) {
  // hanger = the back of the tee on the hanger first, the on-model back view on hover
  const src = view ? photoUrl(product.slug, view) : hanger ? photoUrl(product.slug, 'hang-back') : product.image
  const hover = hanger ? photoUrl(product.slug, 'model-back') : product.hoverImage
  return (
    <div className={`tc-stage tc-stage--photo ${hanger ? 'tc-stage--hanger' : ''} ${className}`}>
      <img className="tc-stage__img tc-stage__front" src={src} alt={`${product.name}, black oversized tee`} loading="lazy" decoding="async" />
      {hoverBack && hover && <img className="tc-stage__img tc-stage__back" src={hover} alt="" loading="lazy" decoding="async" />}
    </div>
  )
}

/** Small square-ish thumbnail for the bag, checkout and search results. */
export function ProductThumb({ product }) {
  return (
    <div className="tc-stage tc-stage--thumb tc-stage--photo">
      <img className="tc-stage__img" src={product.thumb} alt={product.name} loading="lazy" decoding="async" />
    </div>
  )
}
