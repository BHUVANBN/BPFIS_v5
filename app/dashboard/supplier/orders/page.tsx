"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Order {
  _id: string;
  orderNumber: string;
  customer: {
    name: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      pincode: string;
    };
  };
  items: {
    productId: string;
    name: string;
    sku: string;
    quantity: number;
    price: number;
    total: number;
  }[];
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  orderStatus: 'new' | 'processing' | 'shipped' | 'delivered' | 'returned' | 'cancelled';
  shippingDetails?: {
    trackingNumber?: string;
    carrier?: string;
    estimatedDelivery?: string;
  };
  createdAt: string;
}

export default function OrdersPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const tabs = [
    { id: 'all', label: 'All Orders', count: 0 },
    { id: 'new', label: 'New', count: 0 },
    { id: 'processing', label: 'Processing', count: 0 },
    { id: 'shipped', label: 'Shipped', count: 0 },
    { id: 'delivered', label: 'Delivered', count: 0 },
    { id: 'returned', label: 'Returns', count: 0 }
  ];

  useEffect(() => {
    loadOrders();
  }, [activeTab, searchTerm]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: activeTab === 'all' ? '' : activeTab,
        search: searchTerm
      });

      const response = await fetch(`/api/supplier/orders?${params}`, {
        headers: {
          'x-seller-id': 'temp-seller-id' // TODO: Get from auth
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/supplier/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-seller-id': 'temp-seller-id'
        },
        body: JSON.stringify({ orderStatus: newStatus })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Order status updated successfully!');
        await loadOrders(); // Reload orders
      } else {
        setError(data.error || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      setError('Failed to update order status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'returned': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Update tab counts based on orders
  useEffect(() => {
    tabs.forEach(tab => {
      if (tab.id === 'all') {
        tab.count = orders.length;
      } else {
        tab.count = orders.filter(order => order.orderStatus === tab.id).length;
      }
    });
  }, [orders]);

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#6b7280]">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#1f3b2c]">Orders Management</h1>
        <p className="text-sm text-[#6b7280] mt-1">Manage customer orders and fulfillment</p>
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border border-[#e2d4b7] rounded-lg">
        <div className="border-b border-[#e2d4b7]">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === tab.id
                    ? 'border-[#1f3b2c] text-[#1f3b2c]'
                    : 'border-transparent text-[#6b7280] hover:text-[#1f3b2c] hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Search and Filters */}
        <div className="p-4 border-b border-[#e2d4b7]">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by order number, customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-[#e2d4b7] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1f3b2c] focus:border-transparent placeholder-gray-600"
              />
            </div>
            <button
              onClick={loadOrders}
              className="inline-flex items-center justify-center rounded-md border border-[#e2d4b7] px-4 py-2 text-sm font-medium text-[#1f3b2c] hover:bg-[#f9fafb]"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-[#6b7280]">
                <p className="text-lg font-medium">No orders found</p>
                <p className="text-sm mt-1">
                  {activeTab === 'all' 
                    ? "You haven't received any orders yet" 
                    : `No ${activeTab} orders found`
                  }
                </p>
              </div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-[#e2d4b7]">
              <thead className="bg-[#f9fafb]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#e2d4b7]">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-[#f9fafb]">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-[#1f3b2c]">
                          {order.orderNumber}
                        </div>
                        <div className="text-xs text-[#6b7280]">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-[#1f3b2c]">
                          {order.customer.name}
                        </div>
                        <div className="text-xs text-[#6b7280]">
                          {order.customer.phone}
                        </div>
                        <div className="text-xs text-[#6b7280]">
                          {order.customer.address.city}, {order.customer.address.state}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-[#6b7280]">
                        {order.items.length} items
                      </div>
                      <div className="text-xs text-[#6b7280]">
                        {order.items.slice(0, 2).map(item => item.name).join(', ')}
                        {order.items.length > 2 && '...'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1f3b2c]">
                      ₹{order.totalAmount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(order.paymentStatus)}`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.orderStatus)}`}>
                        {order.orderStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          href={`/dashboard/supplier/orders/${order._id}`}
                          className="text-[#1f3b2c] hover:text-[#2d4f3c]"
                        >
                          View
                        </Link>
                        
                        {/* Status Update Dropdown */}
                        {order.orderStatus !== 'delivered' && order.orderStatus !== 'cancelled' && order.orderStatus !== 'returned' && (
                          <select
                            onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                            className="text-xs border border-[#e2d4b7] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#1f3b2c] text-gray-700"
                            defaultValue=""
                          >
                            <option value="" disabled>Update</option>
                            {order.orderStatus === 'new' && (
                              <option value="processing">Processing</option>
                            )}
                            {order.orderStatus === 'processing' && (
                              <option value="shipped">Shipped</option>
                            )}
                            {order.orderStatus === 'shipped' && (
                              <option value="delivered">Delivered</option>
                            )}
                            <option value="cancelled">Cancel</option>
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
