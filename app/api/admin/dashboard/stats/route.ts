import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.config';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/User';
import { Seller, Product, Order, DailyAnalytics } from '@/lib/models/supplier';
import { MarketplaceOrder } from '@/lib/models/marketplace-order';

// Define interfaces for order types
interface MarketplaceOrderType {
  orderId: string;
  customerDetails: {
    name: string;
  };
  totalAmount: number;
  status: string;
  createdAt: Date;
}

interface SupplierOrderType {
  orderNumber: string;
  customer: {
    name: string;
  };
  totalAmount: number;
  orderStatus: string;
  createdAt: Date;
}

interface FarmerOrderType {
  _id: string;
  farmer: {
    name: string;
  };
  totalAmount: number;
  status: string;
  createdAt: Date;
}

interface RecentActivity {
  type: string;
  id: string;
  title: string;
  description: string;
  amount: number;
  status: string;
  timestamp: Date;
  icon: string;
}

export async function GET() {
  try {
    // Dynamic import to avoid module resolution issues
    const { FarmerOrder } = await import('@/lib/models/FarmerOrder');
    
    // Verify admin authentication
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to database if not already connected
    await connectDB();

    // Get counts for dashboard
    const [
      totalFarmers,
      totalSuppliers,
      totalProducts,
      totalMarketplaceOrders,
      totalSupplierOrders,
      recentActivities,
      topProducts
    ] = await Promise.all([
      // Count farmers
      User.countDocuments({ role: 'farmer' }),
      
      // Count suppliers
      User.countDocuments({ role: 'supplier' }),
      
      // Count active products
      Product.countDocuments({ status: 'active' }),
      
      // Count marketplace orders
      MarketplaceOrder.countDocuments(),
      
      // Count supplier orders
      Order.countDocuments(),
      
      // Get recent activities from multiple collections
      (async () => {
        const [marketplaceOrders, supplierOrders, farmerOrders] = await Promise.all([
          // Marketplace Orders
          (MarketplaceOrder as any).find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('orderId customerDetails.name totalAmount status createdAt')
            .lean() as Promise<MarketplaceOrderType[]>,
            
          // Supplier Orders
          (Order as any).find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('orderNumber customer.name totalAmount orderStatus createdAt')
            .lean() as Promise<SupplierOrderType[]>,
            
          // Farmer Orders
          (FarmerOrder as any).find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('_id farmer.name totalAmount status createdAt')
            .populate('farmer', 'name')
            .lean() as Promise<FarmerOrderType[]>
        ]);

        // Map to common activity format
        const activities: RecentActivity[] = [
          ...marketplaceOrders.map(order => ({
            type: 'marketplace_order',
            id: order.orderId,
            title: 'New Marketplace Order',
            description: `Order #${order.orderId} - ${order.customerDetails?.name || 'Customer'}`,
            amount: order.totalAmount,
            status: order.status,
            timestamp: order.createdAt,
            icon: 'shopping-bag'
          })),
          
          ...supplierOrders.map(order => ({
            type: 'supplier_order',
            id: order.orderNumber,
            title: 'New Supplier Order',
            description: `Order #${order.orderNumber} - ${order.customer?.name || 'Customer'}`,
            amount: order.totalAmount,
            status: order.orderStatus,
            timestamp: order.createdAt,
            icon: 'package'
          })),
          
          ...farmerOrders.map(order => ({
            type: 'farmer_order',
            id: order._id.toString(),
            title: 'New Farmer Order',
            description: `Order from ${order.farmer?.name || 'Farmer'}`,
            amount: order.totalAmount,
            status: order.status,
            timestamp: order.createdAt,
            icon: 'truck'
          }))
        ];

        // Sort by timestamp and limit to 10 most recent
        return activities
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 10);
      })(),
      
      // Get top products
      (async () => {
        const products = await Product.aggregate([
          { $match: { status: 'active' } },
          { $sort: { 'metrics.views': -1 } },
          { $limit: 5 },
          {
            $project: {
              name: 1,
              price: 1,
              images: { $slice: ['$images', 1] },
              views: '$metrics.views',
              orders: '$metrics.orders',
              revenue: { $multiply: ['$price', '$metrics.orders'] }
            }
          }
        ]);
        
        return products.map((p: any) => ({
          id: p._id.toString(),
          name: p.name,
          price: p.price,
          image: p.images[0]?.url || '',
          views: p.views || 0,
          orders: p.orders || 0,
          revenue: p.revenue || 0
        }));
      })()
    ]);

    // Calculate total revenue
    const totalRevenue = topProducts.reduce((sum: number, p: any) => sum + (p.revenue || 0), 0);

    // Prepare response
    const stats = {
      totalFarmers,
      totalSuppliers,
      totalProducts,
      totalMarketplaceOrders,
      totalSupplierOrders,
      totalRevenue,
      recentActivities,
      topProducts,
      recentOrders: recentActivities.slice(0, 5), // For backward compatibility
      recentActivity: recentActivities // For backward compatibility
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
