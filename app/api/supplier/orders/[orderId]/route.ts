import { NextRequest, NextResponse } from 'next/server';
import { Order } from '@/lib/models/order';
import { connectDB } from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    const sellerId = request.headers.get('x-seller-id');
    
    if (!sellerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    await connectDB();

    // Find and update the specific order
    const order = await Order.findOneAndUpdate(
      { 
        _id: orderId,
        ...(sellerId !== 'temp-seller-id' && { sellerId })
      },
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
