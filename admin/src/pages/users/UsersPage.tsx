import { PageIntro } from '@/components/layout/PageIntro'
import { UsersPanel } from '@/components/users/UsersPanel'

export function UsersPage() {
  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Operations"
        title="Users"
        description="Manage admin and editor access. Authentication stays simple, but this workspace gives account management its own operational home."
      />
      <UsersPanel />
    </div>
  )
}
