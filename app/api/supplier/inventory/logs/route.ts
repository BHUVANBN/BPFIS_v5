import { NextRequest, NextResponse } from 'next/server';
import { Product } from '@/lib/models/product';
import { connectDB } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const sellerId = request.headers.get('x-seller-id');
    
    if (!sellerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Fetch products with recent inventory changes
    const products = await Product.find({
      ...(sellerId !== 'temp-seller-id' && { sellerId }),
      'inventory.lastUpdated': { $exists: true }
    })
    .select('name sku inventory.currentStock inventory.lastUpdated inventory.previousStock')
    .sort({ 'inventory.lastUpdated': -1 })
    .limit(limit)
    .lean();

    const logs = products.map(product => {
      const currentStock = product.inventory?.currentStock || 0;
      const previousStock = product.inventory?.previousStock || 0;
      const change = currentStock - previousStock;
      
      return {
        id: product._id,
        productName: product.name,
        sku: product.sku,
        type: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'no_change',
        quantity: Math.abs(change),
        previousStock,
        newStock: currentStock,
        timestamp: product.inventory?.lastUpdated || new Date(),
        reason: change > 0 ? 'Stock added' : change < 0 ? 'Stock deducted' : 'No change'
      };
    });

    return NextResponse.json({
      logs,
      total: logs.length
    });
  } catch (error) {
    console.error('Error fetching inventory logs:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory logs' }, { status: 500 });
  }
}
