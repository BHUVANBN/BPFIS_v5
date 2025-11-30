import { NextRequest, NextResponse } from 'next/server';
import { Product } from '@/lib/models/product';
import { connectDB } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const sellerId = request.headers.get('x-seller-id');
    
    if (!sellerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, quantity, reason } = body;

    if (!productId || quantity === undefined) {
      return NextResponse.json({ error: 'Product ID and quantity are required' }, { status: 400 });
    }

    await connectDB();

    // Find and update the product
    const product = await Product.findOne({ 
      _id: productId,
      ...(sellerId !== 'temp-seller-id' && { sellerId })
    });
    
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Store previous stock for tracking
    const previousStock = product.inventory?.currentStock || 0;
    
    // Update inventory
    if (!product.inventory) {
      product.inventory = {};
    }
    
    product.inventory.previousStock = previousStock;
    product.inventory.currentStock = quantity;
    product.inventory.lastUpdated = new Date();
    product.inventory.lastUpdateReason = reason || 'Manual update';
    
    await product.save();

    return NextResponse.json({
      message: 'Inventory updated successfully',
      update: {
        productId,
        previousStock,
        newStock: quantity,
        change: quantity - previousStock,
        reason: reason || 'Manual update',
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error updating inventory:', error);
    return NextResponse.json({ error: 'Failed to update inventory' }, { status: 500 });
  }
}
