import { NextRequest, NextResponse } from 'next/server';
import { Product } from '@/lib/models/product';
import { Seller } from '@/lib/models/seller';
import { connectDB } from '@/lib/db';

function getSellerId(request: NextRequest): string | null {
  return request.headers.get('x-seller-id') || null;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const sellerId = getSellerId(request);
    if (!sellerId) {
      return NextResponse.json({ error: 'Seller ID is required' }, { status: 401 });
    }

    console.log('🏆 Fetching top products:', { sellerId });

    const seller = await Seller.findById(sellerId);
    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    const products = await Product.find({ sellerId, status: 'active' })
      .sort({ 'salesData.totalSold': -1 })
      .limit(10)
      .select('name salesData.totalSold salesData.totalRevenue')
      .lean();

    const formattedProducts = products.map(product => ({
      _id: product._id,
      name: product.name,
      quantity: product.salesData.totalSold,
      revenue: product.salesData.totalRevenue
    }));

    return NextResponse.json({ products: formattedProducts });

  } catch (error) {
    console.error('❌ Error fetching top products:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
