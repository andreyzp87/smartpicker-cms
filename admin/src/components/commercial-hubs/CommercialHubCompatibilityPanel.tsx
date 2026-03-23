import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TableSkeleton } from '@/components/ui/LoadingSkeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CompatibilityStatusBadge, ReviewStateBadge } from '@/components/compatibility/CompatibilityBadges'

type HubCompatibilityRow = {
  id: number
  status: 'verified' | 'supported' | 'reported' | 'untested' | 'incompatible'
  reviewState: 'pending' | 'approved' | 'rejected'
  supportSummary: string | null
  product: {
    name: string
    manufacturer: { name: string } | null
  }
  evidence: { id: number }[]
}

export function CommercialHubCompatibilityPanel({ hubId }: { hubId: number }) {
  const { data = [], isLoading } = trpc.compatibility.productHubsByHubId.useQuery({ hubId }) as {
    data: HubCompatibilityRow[] | undefined
    isLoading: boolean
  }

  return (
    <Card className="border-white/70 bg-white/85 shadow-[0_20px_60px_rgba(22,36,32,0.08)]">
      <CardHeader>
        <CardTitle>Direct Compatibility Rows</CardTitle>
        <CardDescription>
          Products currently linked directly to this commercial hub.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : data.length > 0 ? (
          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Evidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-950">{row.product.name}</p>
                        <p className="text-xs text-slate-500">{row.product.manufacturer?.name ?? '—'}</p>
                        {row.supportSummary ? (
                          <p className="mt-1 text-xs text-slate-600">{row.supportSummary}</p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <CompatibilityStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell>
                      <ReviewStateBadge state={row.reviewState} />
                    </TableCell>
                    <TableCell>{row.evidence.length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-sm text-slate-600">
            No direct compatibility rows yet.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
