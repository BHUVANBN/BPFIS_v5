import { NextRequest, NextResponse } from 'next/server';
import { Order } from '@/lib/models/order';
import { Seller } from '@/lib/models/seller';
import { connectDB } from '@/lib/db';

// Helper function to get seller ID from request headers
function getSellerId(request: NextRequest): string | null {
  return request.headers.get('x-seller-id') || null;
}

// GET /api/supplier/dashboard/recent-orders - Get recent orders
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

    console.log('📋 Fetching recent orders:', { sellerId });

    // Validate seller exists
    const seller = await Seller.findById(sellerId);
    if (!seller) {
      return NextResponse.json(
        { error: 'Seller not found' },
        { status: 404 }
      );
    }

    // Get real recent orders from database
    const orders = await Order.find({ sellerId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderNumber customer totalAmount status createdAt')
      .lean();

    console.log('✅ Recent orders fetched:', { sellerId, count: orders.length });

    return NextResponse.json({
      orders
    });

  } catch (error) {
    console.error('❌ Error fetching recent orders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
