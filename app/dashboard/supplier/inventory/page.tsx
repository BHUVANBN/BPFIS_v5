"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface LowStockProduct {
  _id: string;
  name: string;
  sku: string;
  category: string;
  stockQuantity: number;
  reorderThreshold: number;
  price: number;
  status: string;
}

interface InventoryLog {
  _id: string;
  productId: {
    _id: string;
    name: string;
    sku: string;
  };
  change: number;
  reason: string;
  previousStock: number;
  newStock: number;
  notes?: string;
  createdAt: string;
}

export default function InventoryPage() {
  const [loading, setLoading] = useState(true);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [updateQuantity, setUpdateQuantity] = useState('');
  const [updateReason, setUpdateReason] = useState('manual');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadInventoryData();
  }, []);

  const loadInventoryData = async () => {
    try {
      // Load low stock products
      const lowStockResponse = await fetch('/api/supplier/inventory/low-stock', {
        headers: {
          'x-seller-id': 'temp-seller-id' // TODO: Get from auth
        }
      });

      if (lowStockResponse.ok) {
        const data = await lowStockResponse.json();
        setLowStockProducts(data.products || []);
      }

      // Load recent inventory logs
      const logsResponse = await fetch('/api/supplier/inventory/logs?limit=10', {
        headers: {
          'x-seller-id': 'temp-seller-id'
        }
      });

      if (logsResponse.ok) {
        const data = await logsResponse.json();
        setInventoryLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error loading inventory data:', error);
      setError('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedProduct || !updateQuantity) {
      setError('Please select a product and enter quantity');
      return;
    }

    try {
      const response = await fetch('/api/supplier/inventory/quick-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-seller-id': 'temp-seller-id'
        },
        body: JSON.stringify({
          productId: selectedProduct,
          quantity: parseInt(updateQuantity),
          reason: updateReason
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Inventory updated successfully!');
        setSelectedProduct('');
        setUpdateQuantity('');
        setUpdateReason('manual');
        await loadInventoryData(); // Reload data
      } else {
        setError(data.error || 'Failed to update inventory');
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
      setError('Failed to update inventory');
    }
  };

  const getStockStatusColor = (stock: number, threshold: number) => {
    if (stock === 0) return 'text-red-600 bg-red-50';
    if (stock <= threshold) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'sale': return 'bg-blue-100 text-blue-800';
      case 'restock': return 'bg-green-100 text-green-800';
      case 'return': return 'bg-purple-100 text-purple-800';
      case 'manual': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#6b7280]">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#1f3b2c]">Inventory Management</h1>
        <p className="text-sm text-[#6b7280] mt-1">Monitor stock levels and manage inventory updates</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Alerts */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-[#e2d4b7] rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[#1f3b2c]">Low Stock Alerts</h2>
              <span className="text-sm text-[#6b7280]">
                {lowStockProducts.length} items need attention
              </span>
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-[#6b7280]">
                  <p className="text-lg font-medium">All stock levels healthy</p>
                  <p className="text-sm mt-1">No products are below reorder threshold</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.map((product) => (
                  <div key={product._id} className="border border-[#e2d4b7] rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-sm font-medium text-[#1f3b2c]">{product.name}</h3>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStockStatusColor(product.stockQuantity, product.reorderThreshold)}`}>
                            {product.stockQuantity === 0 ? 'Out of Stock' : product.stockQuantity <= product.reorderThreshold ? 'Low Stock' : 'In Stock'}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center space-x-4 text-xs text-[#6b7280]">
                          <span>SKU: {product.sku}</span>
                          <span>Category: {product.category}</span>
                          <span>Price: ₹{product.price}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-semibold ${getStockStatusColor(product.stockQuantity, product.reorderThreshold).split(' ')[0]}`}>
                          {product.stockQuantity}
                        </div>
                        <div className="text-xs text-[#6b7280]">
                          Reorder at {product.reorderThreshold}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Stock Update */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-[#e2d4b7] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[#1f3b2c] mb-6">Quick Stock Update</h2>
            
            <form onSubmit={handleQuickUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1f3b2c] mb-2">
                  Search Product
                </label>
                <input
                  type="text"
                  placeholder="Type product name or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e2d4b7] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1f3b2c] focus:border-transparent placeholder-gray-600 text-gray-700"
                />
              </div>

              <div>
                <label htmlFor="selectedProduct" className="block text-sm font-medium text-[#1f3b2c] mb-2">
                  Select Product
                </label>
                <select
                  id="selectedProduct"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e2d4b7] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1f3b2c] focus:border-transparent placeholder-gray-600 text-gray-700"
                  required
                >
                  <option value="">Choose a product...</option>
                  {lowStockProducts.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name} ({product.sku}) - Current: {product.stockQuantity}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="updateQuantity" className="block text-sm font-medium text-[#1f3b2c] mb-2">
                  New Quantity
                </label>
                <input
                  id="updateQuantity"
                  type="number"
                  min="0"
                  value={updateQuantity}
                  onChange={(e) => setUpdateQuantity(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e2d4b7] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1f3b2c] focus:border-transparent placeholder-gray-600 text-gray-700"
                  placeholder="Enter new quantity"
                  required
                />
              </div>

              <div>
                <label htmlFor="updateReason" className="block text-sm font-medium text-[#1f3b2c] mb-2">
                  Update Reason
                </label>
                <select
                  id="updateReason"
                  value={updateReason}
                  onChange={(e) => setUpdateReason(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e2d4b7] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1f3b2c] focus:border-transparent placeholder-gray-600 text-gray-700"
                >
                  <option value="manual">Manual Update</option>
                  <option value="restock">Restock</option>
                  <option value="adjustment">Stock Adjustment</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-[#1f3b2c] text-white py-2 px-4 rounded-md hover:bg-[#2d4f3c] focus:outline-none focus:ring-2 focus:ring-[#1f3b2c] focus:ring-offset-2 text-sm font-medium"
              >
                Update Stock
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Inventory Activity Log */}
      <div className="bg-white border border-[#e2d4b7] rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[#1f3b2c]">Recent Inventory Activity</h2>
          <Link
            href="/dashboard/supplier/inventory/logs"
            className="text-sm text-[#1f3b2c] hover:underline"
          >
            View all logs
          </Link>
        </div>

        {inventoryLogs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#6b7280]">No recent inventory activity</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#e2d4b7]">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                    Change
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                    Stock Before/After
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6b7280] uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#e2d4b7]">
                {inventoryLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-[#f9fafb]">
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-[#1f3b2c]">{log.productId.name}</div>
                        <div className="text-xs text-[#6b7280]">{log.productId.sku}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${
                        log.change > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {log.change > 0 ? '+' : ''}{log.change}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getReasonColor(log.reason)}`}>
                        {log.reason}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#6b7280]">
                      {log.previousStock} → {log.newStock}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#6b7280]">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
