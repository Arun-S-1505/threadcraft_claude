import Icon from './Icon'
import { useStore } from '../../store/StoreContext'

export default function Toast() {
  const { toast } = useStore()
  return (
    <div className="tc-toast-region" aria-live="polite" role="status">
      {toast && (
        <div key={toast.id} className="tc-toast">
          <Icon name="check" size={16} /> {toast.message}
        </div>
      )}
    </div>
  )
}
