'use client';

import { FiPackage, FiUsers, FiDollarSign as FiRupee } from 'react-icons/fi';
import StatCard from './components/StatCard';
import RecentActivities from './components/RecentActivities';
import TopProducts from './components/TopProducts';
import { useDashboardData } from './hooks/useDashboardData';

export default function AdminDashboard() {
  const { data: stats, isLoading, error } = useDashboardData();

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-red-800 font-medium">Error loading dashboard</h3>
          <p className="text-red-600 text-sm mt-1">Failed to load dashboard data. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="pb-5 border-b border-gray-200">
        <h1 className="text-3xl font-bold leading-tight text-gray-900">Dashboard</h1>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard
          title="Total Farmers"
          value={stats?.totalFarmers?.toLocaleString() || '0'}
          icon={<FiUsers className="h-6 w-6 text-white" />}
          color="bg-indigo-500"
          isLoading={isLoading}
        />
        
        <StatCard
          title="Total Suppliers"
          value={stats?.totalSuppliers?.toLocaleString() || '0'}
          icon={<FiPackage className="h-6 w-6 text-white" />}
          color="bg-green-500"
          isLoading={isLoading}
        />
        
        <StatCard
          title="Total Products"
          value={stats?.totalProducts?.toLocaleString() || '0'}
          icon={<FiPackage className="h-6 w-6 text-white" />}
          color="bg-yellow-500"
          isLoading={isLoading}
        />
      </div>

      <div className="mt-8">
        <div className="mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activities</h2>
            <RecentActivities 
              activities={stats?.recentOrders?.map(order => ({
                id: order.id,
                type: 'marketplace_order',
                title: `Order #${order.id.substring(0, 8)}`,
                description: `New order from ${order.customer}`,
                amount: order.amount,
                status: order.status,
                timestamp: new Date(),
                user: order.customer
              }))} 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Top Products</h2>
            <TopProducts products={stats?.topProducts?.map(product => ({
              ...product,
              category: 'General'
            }))} />
          </div>
        </div>
      </div>
    </div>
  );
}
