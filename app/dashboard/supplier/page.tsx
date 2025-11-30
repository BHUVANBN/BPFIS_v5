"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  activeProducts: number;
  avgOrderValue: number;
  revenueGrowth: number;
  orderGrowth: number;
}

interface RecentOrder {
  _id: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

interface LowStockProduct {
  _id: string;
  name: string;
  sku: string;
  stockQuantity: number;
  reorderThreshold: number;
}

interface TopProduct {
  _id: string;
  name: string;
  quantity: number;
  revenue: number;
}

export default function SupplierDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // For development, check localStorage first for completed setup
      const localProfile = localStorage.getItem('sellerProfile');
      if (!localProfile) {
        // No local profile found, check API
        const profileResponse = await fetch('/api/seller', {
          headers: {
            'x-seller-id': 'temp-seller-id' // TODO: Get from auth
          }
        });

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          
          // If setup is needed, redirect to setup page
          if (profileData.needsSetup) {
            window.location.href = '/dashboard/supplier/setup';
            return;
          }
        }
      }

      // Load dashboard data
      const [statsRes, ordersRes, lowStockRes, topProductsRes] = await Promise.all([
        fetch('/api/supplier/dashboard/stats', {
          headers: {
            'x-seller-id': 'temp-seller-id' // TODO: Get from auth
          }
        }),
        fetch('/api/supplier/dashboard/recent-orders', {
          headers: {
            'x-seller-id': 'temp-seller-id' // TODO: Get from auth
          }
        }),
        fetch('/api/supplier/dashboard/low-stock', {
          headers: {
            'x-seller-id': 'temp-seller-id' // TODO: Get from auth
          }
        }),
        fetch('/api/supplier/dashboard/top-products', {
          headers: {
            'x-seller-id': 'temp-seller-id' // TODO: Get from auth
          }
        })
      ]);

      // Handle stats response
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      } else {
        setStats({
          totalRevenue: 0,
          totalOrders: 0,
          activeProducts: 0,
          avgOrderValue: 0,
          revenueGrowth: 0,
          orderGrowth: 0
        });
      }

      // Handle recent orders response
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setRecentOrders(ordersData.orders || []);
      } else {
        setRecentOrders([]);
      }

      // Handle low stock response
      if (lowStockRes.ok) {
        const lowStockData = await lowStockRes.json();
        setLowStockProducts(lowStockData.products || []);
      } else {
        setLowStockProducts([]);
      }

      // Handle top products response
      if (topProductsRes.ok) {
        const topProductsData = await topProductsRes.json();
        setTopProducts(topProductsData.products || []);
      } else {
        setTopProducts([]);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      
      // Set empty states on error
      setStats({
        totalRevenue: 0,
        totalOrders: 0,
        activeProducts: 0,
        avgOrderValue: 0,
        revenueGrowth: 0,
        orderGrowth: 0
      });
      setRecentOrders([]);
      setLowStockProducts([]);
      setTopProducts([]);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#6b7280]">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#1f3b2c]">Dashboard</h1>
        <p className="text-sm text-[#6b7280] mt-1">Welcome back! Here's what's happening with your business today.</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="bg-white border border-[#e2d4b7] rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#6b7280]">Total Revenue</p>
              <p className="text-2xl font-semibold text-[#1f3b2c]">
                ₹{stats?.totalRevenue.toLocaleString() || '0'}
              </p>
              {stats?.revenueGrowth && (
                <p className={`text-sm mt-1 ${stats.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.revenueGrowth > 0 ? '↑' : '↓'} {Math.abs(stats.revenueGrowth)}% from last month
                </p>
              )}
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white border border-[#e2d4b7] rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#6b7280]">Total Orders</p>
              <p className="text-2xl font-semibold text-[#1f3b2c]">
                {stats?.totalOrders.toLocaleString() || '0'}
              </p>
              {stats?.orderGrowth && (
                <p className={`text-sm mt-1 ${stats.orderGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.orderGrowth > 0 ? '↑' : '↓'} {Math.abs(stats.orderGrowth)}% from last month
                </p>
              )}
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Active Products */}
        <div className="bg-white border border-[#e2d4b7] rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#6b7280]">Active Products</p>
              <p className="text-2xl font-semibold text-[#1f3b2c]">
                {stats?.activeProducts.toLocaleString() || '0'}
              </p>
              <p className="text-sm text-[#6b7280] mt-1">Products listed</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white border border-[#e2d4b7] rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#6b7280]">Avg Order Value</p>
              <p className="text-2xl font-semibold text-[#1f3b2c]">
                ₹{stats?.avgOrderValue.toFixed(2) || '0.00'}
              </p>
              <p className="text-sm text-[#6b7280] mt-1">Per order</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-[#e2d4b7] rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[#1f3b2c]">Recent Orders</h2>
              <Link
                href="/dashboard/supplier/orders"
                className="text-sm text-[#1f3b2c] hover:underline"
              >
                View all
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[#6b7280]">No recent orders</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order._id} className="flex items-center justify-between p-4 border border-[#e2d4b7] rounded-lg">
                    <div>
                      <p className="font-medium text-[#1f3b2c]">{order.orderNumber}</p>
                      <p className="text-sm text-[#6b7280]">{order.customerName}</p>
                      <p className="text-xs text-[#6b7280]">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[#1f3b2c]">₹{order.totalAmount}</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-[#e2d4b7] rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[#1f3b2c]">Low Stock Alert</h2>
              <Link
                href="/dashboard/supplier/inventory"
                className="text-sm text-[#1f3b2c] hover:underline"
              >
                Manage
              </Link>
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[#6b7280]">All stock levels healthy</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.map((product) => (
                  <div key={product._id} className="flex items-center justify-between p-3 border border-[#e2d4b7] rounded-lg">
                    <div>
                      <p className="font-medium text-[#1f3b2c] text-sm">{product.name}</p>
                      <p className="text-xs text-[#6b7280]">{product.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${
                        product.stockQuantity === 0 ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {product.stockQuantity}
                      </p>
                      <p className="text-xs text-[#6b7280]">Reorder at {product.reorderThreshold}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white border border-[#e2d4b7] rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[#1f3b2c]">Top Selling Products</h2>
          <Link
            href="/dashboard/supplier/products"
            className="text-sm text-[#1f3b2c] hover:underline"
          >
            View all
          </Link>
        </div>

        {topProducts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#6b7280]">No sales data available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {topProducts.map((product, index) => (
              <div key={product._id} className="p-4 border border-[#e2d4b7] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="w-6 h-6 bg-[#1f3b2c] text-white rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="text-sm text-[#6b7280]">#{index + 1}</span>
                </div>
                <p className="font-medium text-[#1f3b2c] text-sm mb-1">{product.name}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#6b7280]">{product.quantity} sold</span>
                  <span className="font-semibold text-[#1f3b2c]">₹{product.revenue}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-[#e2d4b7] rounded-lg p-6">
        <h2 className="text-lg font-semibold text-[#1f3b2c] mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/dashboard/supplier/products/new"
            className="flex items-center justify-center px-4 py-3 border border-[#e2d4b7] rounded-md text-sm font-medium text-[#1f3b2c] hover:bg-[#f9fafb]"
          >
            Add New Product
          </Link>
          <Link
            href="/dashboard/supplier/inventory"
            className="flex items-center justify-center px-4 py-3 border border-[#e2d4b7] rounded-md text-sm font-medium text-[#1f3b2c] hover:bg-[#f9fafb]"
          >
            Update Inventory
          </Link>
          <Link
            href="/dashboard/supplier/orders"
            className="flex items-center justify-center px-4 py-3 border border-[#e2d4b7] rounded-md text-sm font-medium text-[#1f3b2c] hover:bg-[#f9fafb]"
          >
            View Orders
          </Link>
          <Link
            href="/dashboard/supplier/profile"
            className="flex items-center justify-center px-4 py-3 border border-[#e2d4b7] rounded-md text-sm font-medium text-[#1f3b2c] hover:bg-[#f9fafb]"
          >
            Profile Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
