import { NextRequest, NextResponse } from 'next/server';
import { Product } from '@/lib/models/product';
import { Seller } from '@/lib/models/seller';
import { connectDB } from '@/lib/db';

// Helper function to get seller ID from request headers
function getSellerId(request: NextRequest): string | null {
  return request.headers.get('x-seller-id') || null;
}

// GET /api/supplier/dashboard/low-stock - Get low stock products
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

    console.log('📦 Fetching low stock products:', { sellerId });

    // Validate seller exists
    const seller = await Seller.findById(sellerId);
    if (!seller) {
      return NextResponse.json(
        { error: 'Seller not found' },
        { status: 404 }
      );
    }

    // Get real low stock products from database
    const products = await Product.find({ 
      sellerId,
      $expr: { $lte: ['$stockQuantity', '$reorderThreshold'] }
    })
    .sort({ stockQuantity: 1 })
    .limit(10)
    .select('name sku stockQuantity reorderThreshold')
    .lean();

    console.log('✅ Low stock products fetched:', { sellerId, count: products.length });

    return NextResponse.json({
      products
    });

  } catch (error) {
    console.error('❌ Error fetching low stock products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
