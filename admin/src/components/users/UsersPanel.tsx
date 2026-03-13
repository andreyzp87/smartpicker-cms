import { useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Loader2, Pencil, Plus, RefreshCcw, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { trpc } from '@/lib/trpc'
import { toast } from 'sonner'

type User = {
  id: number
  email: string
  name: string
  isActive: boolean
  lastLoginAt: string | Date | null
  createdAt: string | Date
  updatedAt: string | Date
}

const emptyCreateForm = {
  name: '',
  email: '',
  password: '',
}

function formatDate(value: unknown) {
  if (!value) {
    return 'Never'
  }

  const date = value instanceof Date ? value : new Date(String(value))

  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }

  return formatDistanceToNow(date, { addSuffix: true })
}

export function UsersPanel() {
  const utils = trpc.useUtils()
  const { data: authData } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  })
  const { data: users = [], isLoading } = trpc.users.list.useQuery()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [passwordUser, setPasswordUser] = useState<User | null>(null)
  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    isActive: 'active',
  })
  const [newPassword, setNewPassword] = useState('')

  const currentUserId = authData?.user?.id ?? null

  useEffect(() => {
    if (editingUser) {
      setEditForm({
        name: editingUser.name,
        email: editingUser.email,
        isActive: editingUser.isActive ? 'active' : 'inactive',
      })
    }
  }, [editingUser])

  useEffect(() => {
    if (!createOpen) {
      setCreateForm(emptyCreateForm)
    }
  }, [createOpen])

  useEffect(() => {
    if (!passwordUser) {
      setNewPassword('')
    }
  }, [passwordUser])

  const invalidateUsers = async () => {
    await Promise.all([utils.users.list.invalidate(), utils.auth.me.invalidate()])
  }

  const createMutation = trpc.users.create.useMutation({
    onSuccess: async () => {
      toast.success('User created successfully')
      setCreateOpen(false)
      await invalidateUsers()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create user')
    },
  })

  const updateMutation = trpc.users.update.useMutation({
    onSuccess: async (user) => {
      toast.success(`${user.name} updated successfully`)
      setEditingUser(null)
      await invalidateUsers()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update user')
    },
  })

  const setPasswordMutation = trpc.users.setPassword.useMutation({
    onSuccess: async (user) => {
      toast.success(`Password reset for ${user.email}`)
      setPasswordUser(null)
      await invalidateUsers()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to reset password')
    },
  })

  const pendingAction = useMemo(
    () => createMutation.isPending || updateMutation.isPending || setPasswordMutation.isPending,
    [createMutation.isPending, setPasswordMutation.isPending, updateMutation.isPending],
  )

  const handleCreateUser = () => {
    createMutation.mutate({
      name: createForm.name,
      email: createForm.email,
      password: createForm.password,
    })
  }

  const handleUpdateUser = () => {
    if (!editingUser) {
      return
    }

    updateMutation.mutate({
      id: editingUser.id,
      data: {
        name: editForm.name,
        email: editForm.email,
        isActive: editForm.isActive === 'active',
      },
    })
  }

  const handleResetPassword = () => {
    if (!passwordUser) {
      return
    }

    setPasswordMutation.mutate({
      id: passwordUser.id,
      password: newPassword,
    })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Admin Users
            </CardTitle>
            <CardDescription>
              Create admin accounts, manage active access, and reset passwords. Registration stays
              disabled.
            </CardDescription>
          </div>
          <CardAction>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="rounded-md border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length > 0 ? (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{user.name}</span>
                            {user.id === currentUserId ? (
                              <Badge variant="outline" className="text-xs">
                                You
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">{user.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant={user.isActive ? 'default' : 'secondary'}
                            className={user.isActive ? 'bg-emerald-600 hover:bg-emerald-600' : ''}
                          >
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {formatDate(user.lastLoginAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingUser(user)}
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPasswordUser(user)}
                            >
                              <RefreshCcw className="h-4 w-4" />
                              Reset Password
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Admin User</DialogTitle>
            <DialogDescription>
              Add a new email/password account with full admin access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-user-name">Name</Label>
              <Input
                id="create-user-name"
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, name: event.target.value }))
                }
                disabled={pendingAction}
                placeholder="Jane Admin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-user-email">Email</Label>
              <Input
                id="create-user-email"
                type="email"
                value={createForm.email}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, email: event.target.value }))
                }
                disabled={pendingAction}
                placeholder="jane@smartpicker.io"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-user-password">Password</Label>
              <Input
                id="create-user-password"
                type="password"
                value={createForm.password}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, password: event.target.value }))
                }
                disabled={pendingAction}
                placeholder="At least 8 characters"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={pendingAction}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={
                pendingAction ||
                createForm.name.trim().length === 0 ||
                createForm.email.trim().length === 0 ||
                createForm.password.length < 8
              }
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update profile details and access status.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-user-name">Name</Label>
              <Input
                id="edit-user-name"
                value={editForm.name}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, name: event.target.value }))
                }
                disabled={pendingAction}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-email">Email</Label>
              <Input
                id="edit-user-email"
                type="email"
                value={editForm.email}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, email: event.target.value }))
                }
                disabled={pendingAction}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editForm.isActive}
                onValueChange={(value) =>
                  setEditForm((current) => ({ ...current, isActive: value }))
                }
                disabled={pendingAction || editingUser?.id === currentUserId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              {editingUser?.id === currentUserId ? (
                <p className="text-sm text-gray-500">
                  Your own account stays active from this screen.
                </p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)} disabled={pendingAction}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateUser}
              disabled={
                pendingAction ||
                editForm.name.trim().length === 0 ||
                editForm.email.trim().length === 0
              }
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!passwordUser} onOpenChange={(open) => !open && setPasswordUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {passwordUser?.email ?? 'this user'}. Existing sessions will be
              signed out.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reset-user-password">New Password</Label>
            <Input
              id="reset-user-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={pendingAction}
              placeholder="At least 8 characters"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPasswordUser(null)}
              disabled={pendingAction}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={pendingAction || newPassword.length < 8}
            >
              {setPasswordMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
