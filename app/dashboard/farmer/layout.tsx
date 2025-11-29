"use client";

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import Header from '../../components/Header/Header';
import { LayoutDashboard, FileText, Layers, ScrollText, ShoppingBag, CloudSun, Store } from 'lucide-react';

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { label: 'Overview', href: '/dashboard/farmer', icon: LayoutDashboard },
  { label: 'KYC Documents', href: '/dashboard/farmer/documents', icon: FileText },
  { label: 'Land Integration', href: '/dashboard/farmer/land', icon: Layers },
  { label: 'Government Schemes', href: '/dashboard/farmer/schemes', icon: ScrollText },
  { label: 'My Orders', href: '/dashboard/farmer/orders', icon: ShoppingBag },
  { label: 'Weather', href: '/dashboard/farmer/weather', icon: CloudSun },
  { label: 'Marketplace', href: '/marketplace', icon: Store },
];

export default function FarmerDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');

  const buildHref = (baseHref: string) => {
    if (!userId || !baseHref.startsWith('/dashboard/farmer')) return baseHref;
    const url = new URL(baseHref, 'http://dummy');
    url.searchParams.set('userId', userId);
    return url.pathname + '?' + url.searchParams.toString();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f0de]">
      <Header />
      <div className="flex flex-grow pt-16">
        <aside className="w-56 bg-[#e7dcc0] border-r border-[#d3c5a3] flex flex-col">
          <nav className="flex-1 py-6">
            <ul className="space-y-1 px-3 text-sm">
              {navItems.map((item) => {
                // Overview should only be active on the exact /dashboard/farmer route.
                // Other dashboard links can treat any sub-path as active (startsWith).
                const isOverview = item.href === '/dashboard/farmer';
                const isActive = isOverview
                  ? pathname === item.href
                  : item.href !== '/marketplace' && pathname?.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={buildHref(item.href)}
                      className={`flex items-center gap-2 rounded-md px-3 py-2 transition-colors ${
                        isActive
                          ? 'bg-[#166534] text-white'
                          : 'text-[#374151] hover:bg-[#166534] hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Sidebar footer removed because profile entry is already in the top navbar */}
        </aside>
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
