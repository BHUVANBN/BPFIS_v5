import { NextRequest, NextResponse } from 'next/server';
import { Product } from '@/lib/models/product';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

// GET /api/supplier/products/[productId] - Get single product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    await connectDB();
    
    // Get seller ID from session/auth
    const sellerId = request.headers.get('x-seller-id');
    if (!sellerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For development, handle temp seller ID without ObjectId validation
    let finalSellerId = sellerId;
    if (sellerId === 'temp-seller-id') {
      finalSellerId = '65a1b2c3d4e5f6789012345';
      console.log('⚠️ Converting temp-seller-id to test seller ID for development (GET)');
    }

    let product;
    
    // For test seller ID, use direct MongoDB query
    if (finalSellerId === '65a1b2c3d4e5f6789012345') {
      const db = mongoose.connection.db;
      if (!db) {
        return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
      }
      
      product = await db.collection('products').findOne({
        _id: new mongoose.Types.ObjectId(productId),
        sellerId: finalSellerId
      });
    } else {
      product = await Product.findOne({
        _id: new mongoose.Types.ObjectId(productId),
        sellerId: finalSellerId
      });
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error fetching product:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      productId: await params.then(p => p.productId).catch(() => 'unknown')
    });
    return NextResponse.json({ 
      error: 'Failed to fetch product',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT /api/supplier/products/[productId] - Update product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    await connectDB();
    
    // Get seller ID from session/auth
    const sellerId = request.headers.get('x-seller-id');
    if (!sellerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, category, description, price, stockQuantity, reorderThreshold, tags, specifications, dimensions, status } = body;

    // Find current product
    const currentProduct = await Product.findOne({
      _id: new mongoose.Types.ObjectId(productId),
      sellerId: sellerId
    });

    if (!currentProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Update product
    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (category) updateData.category = category;
    if (description) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (stockQuantity !== undefined) updateData.stockQuantity = stockQuantity;
    if (reorderThreshold !== undefined) updateData.reorderThreshold = reorderThreshold;
    if (tags) updateData.tags = tags;
    if (specifications) updateData.specifications = specifications;
    if (dimensions) updateData.dimensions = dimensions;
    if (status) updateData.status = status;

    const product = await Product.findByIdAndUpdate(
      new mongoose.Types.ObjectId(productId),
      updateData,
      { new: true, runValidators: true }
    );

    return NextResponse.json({ 
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// DELETE /api/supplier/products/[productId] - Delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    await connectDB();
    
    // Get seller ID from session/auth
    const sellerId = request.headers.get('x-seller-id');
    if (!sellerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const product = await Product.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(productId),
      sellerId: sellerId
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}

// POST /api/supplier/products/[productId]/toggle-active - Toggle product status
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    await connectDB();
    
    // Get seller ID from session/auth
    const sellerId = request.headers.get('x-seller-id');
    if (!sellerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For development, handle temp seller ID without ObjectId validation
    let finalSellerId = sellerId;
    if (sellerId === 'temp-seller-id') {
      finalSellerId = '65a1b2c3d4e5f6789012345';
      console.log('⚠️ Converting temp-seller-id to test seller ID for development (TOGGLE)');
    }

    let product;
    
    // For test seller ID, use direct MongoDB query
    if (finalSellerId === '65a1b2c3d4e5f6789012345') {
      const db = mongoose.connection.db;
      if (!db) {
        return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
      }
      
      product = await db.collection('products').findOne({
        _id: new mongoose.Types.ObjectId(productId),
        sellerId: finalSellerId
      });
    } else {
      product = await Product.findOne({
        _id: new mongoose.Types.ObjectId(productId),
        sellerId: finalSellerId
      });
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Toggle between active and inactive
    const newStatus = product.status === 'active' ? 'inactive' : 'active';
    
    let updatedProduct;
    
    // For test seller ID, use direct MongoDB update
    if (finalSellerId === '65a1b2c3d4e5f6789012345') {
      const db = mongoose.connection.db;
      if (!db) {
        return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
      }
      
      const result = await db.collection('products').updateOne(
        { _id: new mongoose.Types.ObjectId(productId), sellerId: finalSellerId },
        { $set: { status: newStatus, updatedAt: new Date() } }
      );
      
      if (result.matchedCount === 0) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      
      updatedProduct = { ...product, status: newStatus, updatedAt: new Date() };
    } else {
      updatedProduct = await Product.findByIdAndUpdate(
        new mongoose.Types.ObjectId(productId),
        { status: newStatus },
        { new: true }
      );
    }

    return NextResponse.json({ 
      message: `Product ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error toggling product status:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      productId: await params.then(p => p.productId).catch(() => 'unknown')
    });
    return NextResponse.json({ 
      error: 'Failed to toggle product status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
