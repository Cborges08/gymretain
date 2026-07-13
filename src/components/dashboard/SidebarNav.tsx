'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/dashboard', label: 'Início' },
  { href: '/dashboard/members', label: 'Membros' },
  { href: '/dashboard/qr-code', label: 'QR Code' },
]

export function SidebarNav() {
  const pathname = usePathname()
  return (
    <ul className="space-y-1">
      {links.map((link) => {
        const isActive = link.href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname.startsWith(link.href)
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {link.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
