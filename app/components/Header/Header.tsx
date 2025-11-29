"use client";

import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const isDashboard = pathname?.startsWith('/dashboard');
  const isFarmer = pathname?.startsWith('/dashboard/farmer');
  const isSupplier = pathname?.startsWith('/dashboard/supplier');
  const userId = searchParams.get('userId');

  const buildDashboardHref = (baseHref: string) => {
    if (!userId) return baseHref;
    const url = new URL(baseHref, 'http://dummy');
    url.searchParams.set('userId', userId);
    return url.pathname + '?' + url.searchParams.toString();
  };

  const handleLogout = () => {
    // We don't have real session handling yet; simply navigate back to home.
    router.push('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-[#f7f0de]/95 backdrop-blur-sm z-50 border-b border-[#e2d4b7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0 flex items-center">
            <Link href={isDashboard ? (isFarmer ? buildDashboardHref('/dashboard/farmer') : isSupplier ? buildDashboardHref('/dashboard/supplier') : '/') : '/'} className="flex items-center">
              <span className="text-2xl font-bold text-[#1f3b2c]">AgriLink</span>
            </Link>
          </div>

          {!isDashboard && (
            <nav className="hidden md:ml-6 md:flex md:items-center md:space-x-8">
              <Link href="/marketplace" className="text-[#374151] hover:text-[#166534] px-3 py-2 text-sm font-medium">
                Marketplace
              </Link>
              <Link href="/#features" className="text-[#374151] hover:text-[#166534] px-3 py-2 text-sm font-medium">
                Features
              </Link>
              <Link href="/login" className="text-[#374151] hover:text-[#166534] px-3 py-2 text-sm font-medium">
                Log In
              </Link>
              <Link
                href="/register"
                className="ml-4 bg-[#166534] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#14532d] transition-colors"
              >
                Register
              </Link>
              <button className="ml-2 p-2 text-[#374151] hover:text-[#166534]">
                <ShoppingCart className="h-5 w-5" />
              </button>
            </nav>
          )}

          {isDashboard && (
            <nav className="hidden md:ml-6 md:flex md:items-center md:space-x-6">
              <span className="text-sm font-semibold text-[#1f3b2c]">
                {isFarmer && 'Farmer Dashboard'}
                {isSupplier && 'Supplier Dashboard'}
                {!isFarmer && !isSupplier && 'Dashboard'}
              </span>

              {isFarmer && (
                <>
                  <Link
                    href={buildDashboardHref('/dashboard/farmer/profile')}
                    className="text-[#374151] hover:text-[#166534] px-3 py-2 text-sm font-medium"
                  >
                    My Profile
                  </Link>
                </>
              )}

              {isSupplier && (
                <>
                  <Link
                    href={buildDashboardHref('/dashboard/supplier')}
                    className="text-[#374151] hover:text-[#166534] px-3 py-2 text-sm font-medium"
                  >
                    Overview
                  </Link>
                  <Link
                    href={buildDashboardHref('/dashboard/supplier')}
                    className="text-[#374151] hover:text-[#166534] px-3 py-2 text-sm font-medium"
                  >
                    My Profile
                  </Link>
                </>
              )}

              <button
                onClick={handleLogout}
                className="ml-4 bg-[#166534] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#14532d] transition-colors"
              >
                Logout
              </button>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
