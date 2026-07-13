import { SidebarNav } from '@/components/dashboard/SidebarNav'
import { logoutAction } from '@/lib/actions/logout'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-6">
          <span className="text-xl font-semibold text-emerald-600">GymRetain</span>
        </div>
        <nav className="flex-1 px-4 py-2">
          <SidebarNav />
        </nav>
        <div className="p-4">
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-50"
            >
              Sair
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
