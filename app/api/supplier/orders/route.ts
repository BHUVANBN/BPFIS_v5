import { NextRequest, NextResponse } from 'next/server';
import { Order } from '@/lib/models/order';
import { connectDB } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const sellerId = request.headers.get('x-seller-id');
    
    if (!sellerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Build query - handle temp seller ID for development
    const query: any = sellerId === 'temp-seller-id' 
      ? {} // For development, fetch all orders (or use email-based lookup)
      : { sellerId };

    if (status && status !== 'all') {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { 'customerDetails.name': { $regex: search, $options: 'i' } },
        { 'customerDetails.email': { $regex: search, $options: 'i' } }
      ];
    }

    // Fetch orders from database
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const total = await Order.countDocuments(query);

    return NextResponse.json({
      orders,
      total,
      page: 1,
      totalPages: Math.ceil(total / 50)
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const sellerId = request.headers.get('x-seller-id');
    
    if (!sellerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, status } = body;

    await connectDB();

    // Find and update the order
    const order = await Order.findOneAndUpdate(
      { _id: orderId, sellerId },
      { 
        status,
        updatedAt: new Date(),
        $push: {
          statusHistory: {
            status,
            timestamp: new Date(),
            updatedBy: 'seller'
          }
        }
      },
      { new: true }
    );

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
