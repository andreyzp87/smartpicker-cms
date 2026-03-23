import { Badge } from '@/components/ui/badge'
import { COMPATIBILITY_STATUSES } from '@/shared/constants'

type CompatibilityStatus = keyof typeof COMPATIBILITY_STATUSES
type ReviewState = 'pending' | 'approved' | 'rejected'

const REVIEW_STYLES: Record<ReviewState, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-900',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  rejected: 'border-rose-200 bg-rose-50 text-rose-900',
}

export function CompatibilityStatusBadge({ status }: { status: CompatibilityStatus }) {
  const style = COMPATIBILITY_STATUSES[status]

  return (
    <Badge
      variant="outline"
      className="border-transparent capitalize text-white"
      style={{ backgroundColor: style.color }}
    >
      {style.name}
    </Badge>
  )
}

export function ReviewStateBadge({ state }: { state: ReviewState }) {
  return (
    <Badge variant="outline" className={REVIEW_STYLES[state]}>
      {state}
    </Badge>
  )
}
