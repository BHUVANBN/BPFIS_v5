import { NextRequest, NextResponse } from 'next/server';
import { Order } from '@/lib/models/order';
import { Product } from '@/lib/models/product';
import { connectDB } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';
    const sellerId = request.headers.get('x-seller-id');
    
    if (!sellerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    switch (range) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Fetch real data from database
    const [orders, products] = await Promise.all([
      Order.find({ 
        ...(sellerId !== 'temp-seller-id' && { sellerId }),
        createdAt: { $gte: startDate, $lte: now },
        'paymentDetails.status': 'paid'
      }).lean(),
      Product.find({ 
        ...(sellerId !== 'temp-seller-id' && { sellerId })
      }).lean()
    ]);

    // Calculate overview metrics
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const activeProducts = products.filter(p => p.status === 'active').length;

    // Generate sales chart data
    const salesChart = [];
    for (let i = 0; i < (range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365); i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      
      const dayOrders = orders.filter(order => 
        order.createdAt >= dayStart && order.createdAt <= dayEnd
      );
      
      salesChart.push({
        date: date.toISOString().split('T')[0],
        revenue: dayOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
        orders: dayOrders.length
      });
    }

    // Calculate top products
    const productRevenue = new Map();
    orders.forEach(order => {
      order.items?.forEach((item: any) => {
        const current = productRevenue.get(item.productId) || { quantity: 0, revenue: 0 };
        productRevenue.set(item.productId, {
          quantity: current.quantity + (item.quantity || 0),
          revenue: current.revenue + (item.price * item.quantity || 0)
        });
      });
    });

    const topProducts = Array.from(productRevenue.entries())
      .map(([productId, data]) => ({
        productId,
        name: products.find(p => p._id.toString() === productId)?.name || 'Unknown Product',
        quantity: data.quantity,
        revenue: data.revenue
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Calculate category breakdown
    const categoryRevenue = new Map();
    orders.forEach(order => {
      order.items?.forEach((item: any) => {
        const product = products.find(p => p._id.toString() === item.productId);
        const category = product?.category || 'other';
        const current = categoryRevenue.get(category) || { revenue: 0, orders: 0 };
        categoryRevenue.set(category, {
          revenue: current.revenue + (item.price * item.quantity || 0),
          orders: current.orders + 1
        });
      });
    });

    const totalCategoryRevenue = Array.from(categoryRevenue.values()).reduce((sum, cat) => sum + cat.revenue, 0);
    const categoryBreakdown = Array.from(categoryRevenue.entries()).map(([category, data]) => ({
      category,
      revenue: data.revenue,
      orders: data.orders,
      percentage: totalCategoryRevenue > 0 ? Math.round((data.revenue / totalCategoryRevenue) * 100) : 0
    })).sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({
      overview: {
        totalRevenue,
        totalOrders,
        avgOrderValue,
        activeProducts
      },
      salesChart,
      topProducts,
      categoryBreakdown
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
