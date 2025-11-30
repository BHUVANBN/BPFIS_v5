import { NextRequest, NextResponse } from 'next/server';
import { Product } from '@/lib/models/product';
import { connectDB } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const sellerId = request.headers.get('x-seller-id');
    
    if (!sellerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Find products with low stock (less than 10 units)
    const lowStockProducts = await Product.find({
      ...(sellerId !== 'temp-seller-id' && { sellerId }),
      status: 'active',
      $or: [
        { 'inventory.currentStock': { $lt: 10 } },
        { 'inventory.currentStock': { $exists: false } }
      ]
    })
    .select('name sku inventory.currentStock inventory.lowStockThreshold')
    .sort({ 'inventory.currentStock': 1 })
    .limit(20)
    .lean();

    const items = lowStockProducts.map(product => ({
      productId: product._id,
      name: product.name,
      sku: product.sku,
      currentStock: product.inventory?.currentStock || 0,
      lowStockThreshold: product.inventory?.lowStockThreshold || 10,
      status: product.inventory?.currentStock < 10 ? 'low' : 'out'
    }));

    return NextResponse.json({
      items,
      total: items.length
    });
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    return NextResponse.json({ error: 'Failed to fetch low stock items' }, { status: 500 });
  }
}
