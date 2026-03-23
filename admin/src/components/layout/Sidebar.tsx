import { Link, useLocation } from 'react-router'
import { Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navigationGroups } from './navigation'

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const location = useLocation()

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition-opacity lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[18.5rem] flex-col border-r border-gray-200 bg-white text-gray-900 shadow-xl transition-transform lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-18 items-center justify-between border-b border-gray-200 px-6 py-5">
          <Link to="/" className="flex items-center gap-3" onClick={onClose}>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-gray-100">
              <Sparkles className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-[0.7rem] uppercase tracking-[0.24em] text-gray-500">
                SmartPicker
              </p>
              <h1 className="text-lg font-semibold tracking-tight text-gray-900">CMS</h1>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 p-2 text-gray-500 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-gray-200 px-6 py-4">
          <p className="text-sm leading-6 text-gray-600">
            Editorial workspace for products, integrations, evidence, and exports.
          </p>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
          {navigationGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 text-[0.68rem] font-medium uppercase tracking-[0.22em] text-gray-500">
                {group.label}
              </p>
              <div className="mt-2 space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive =
                    location.pathname === item.href ||
                    (item.href !== '/' && location.pathname.startsWith(item.href))

                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={onClose}
                      className={cn(
                        'group flex items-start gap-3 rounded-2xl px-3 py-3 transition-all',
                        isActive
                          ? 'bg-gray-100 text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      )}
                    >
                      <div
                        className={cn(
                          'mt-0.5 rounded-xl border p-2',
                          isActive
                            ? 'border-gray-300 bg-white text-gray-700'
                            : 'border-gray-200 bg-gray-50 text-gray-400',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{item.name}</p>
                        <p
                          className={cn(
                            'mt-1 text-xs leading-5',
                            isActive ? 'text-gray-600' : 'text-gray-500',
                          )}
                        >
                          {item.description}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-gray-200 px-6 py-4">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-[0.7rem] uppercase tracking-[0.22em] text-gray-500">
              Schema Shift
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Platforms, integrations, hubs, and evidence are now distinct editorial resources.
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
