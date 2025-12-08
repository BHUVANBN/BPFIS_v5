import { NextRequest, NextResponse } from 'next/server';
import { Seller } from '@/lib/models/seller';
import { Product } from '@/lib/models/product';
import { Order } from '@/lib/models/order';
import { connectDB } from '@/lib/db';

// Helper function to get seller ID from request headers
function getSellerId(request: NextRequest): string | null {
  return request.headers.get('x-seller-id') || null;
}

// GET /api/supplier/dashboard/stats - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const sellerId = getSellerId(request);
    if (!sellerId) {
      return NextResponse.json(
        { error: 'Seller ID is required' },
        { status: 401 }
      );
    }

    console.log('📊 Fetching dashboard stats:', { sellerId });

    // Validate seller exists
    const seller = await Seller.findById(sellerId);
    if (!seller) {
      return NextResponse.json(
        { error: 'Seller not found' },
        { status: 404 }
      );
    }

    // Get real statistics from database
    const [
      totalOrders,
      revenueResult,
      activeProducts,
      avgOrderResult
    ] = await Promise.all([
      Order.countDocuments({ sellerId }),
      Order.aggregate([
        { $match: { sellerId, 'paymentDetails.status': 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Product.countDocuments({ sellerId, status: 'active' }),
      Order.aggregate([
        { $match: { sellerId, 'paymentDetails.status': 'paid' } },
        { $group: { _id: null, avg: { $avg: '$totalAmount' } } }
      ])
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;
    const avgOrderValue = avgOrderResult[0]?.avg || 0;

    // Get previous month data for growth calculation
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const [lastMonthOrders, lastMonthRevenue] = await Promise.all([
      Order.countDocuments({ 
        sellerId, 
        createdAt: { $gte: lastMonth, $lt: new Date() } 
      }),
      Order.aggregate([
        { 
          $match: { 
            sellerId, 
            'paymentDetails.status': 'paid',
            createdAt: { $gte: lastMonth, $lt: new Date() }
          } 
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    const lastMonthRevenueTotal = lastMonthRevenue[0]?.total || 0;
    const revenueGrowth = lastMonthRevenueTotal > 0 
      ? ((totalRevenue - lastMonthRevenueTotal) / lastMonthRevenueTotal * 100).toFixed(1)
      : '0';
    
    const orderGrowth = lastMonthOrders > 0
      ? ((totalOrders - lastMonthOrders) / lastMonthOrders * 100).toFixed(1)
      : '0';

    console.log('✅ Dashboard stats fetched:', { sellerId, totalOrders, totalRevenue });

    return NextResponse.json({
      totalRevenue,
      totalOrders,
      activeProducts,
      avgOrderValue,
      revenueGrowth: parseFloat(revenueGrowth),
      orderGrowth: parseFloat(orderGrowth)
    });

  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
