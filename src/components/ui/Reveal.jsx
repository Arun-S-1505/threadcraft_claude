import { useInView } from '../../hooks/useReveal'

/**
 * Scroll-reveal wrapper. `delay` in ms staggers siblings.
 * `as` lets you render any element; styling lives in brand.css (.reveal / .reveal.in).
 */
export default function Reveal({ as: Tag = 'div', delay = 0, className = '', style, children, ...rest }) {
  const [ref, seen] = useInView()
  return (
    <Tag ref={ref} className={`reveal ${seen ? 'in' : ''} ${className}`} style={{ '--d': `${delay}ms`, ...style }} {...rest}>
      {children}
    </Tag>
  )
}
