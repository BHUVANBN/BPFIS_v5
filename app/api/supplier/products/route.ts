import { NextRequest, NextResponse } from 'next/server';
import { Product } from '@/lib/models/product';
import { Seller } from '@/lib/models/seller';
import { connectDB } from '@/lib/db';

function getSellerId(request: NextRequest): string | null {
  return request.headers.get('x-seller-id') || null;
}

// GET /api/supplier/products - Get seller's products
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const sellerId = getSellerId(request);
    if (!sellerId) {
      return NextResponse.json({ error: 'Seller ID is required' }, { status: 401 });
    }

    // For development, handle temp seller ID without ObjectId validation
    if (sellerId === 'temp-seller-id') {
      return NextResponse.json({
        products: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0
        }
      });
    }

    // Validate seller exists
    const seller = await Seller.findById(sellerId);
    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    // Get query parameters for filtering and pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const category = searchParams.get('category') || '';

    // Build query
    const query: any = { sellerId };
    
    if (status) {
      query.status = status;
    }
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Get products with pagination
    const skip = (page - 1) * limit;
    const [products, totalCount] = await Promise.all([
      Product.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('name sku price stockQuantity status category images salesData createdAt')
        .lean(),
      Product.countDocuments(query)
    ]);

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error(' Error fetching products:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/supplier/products - Create new product
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const sellerId = getSellerId(request);
    if (!sellerId) {
      return NextResponse.json({ error: 'Seller ID is required' }, { status: 401 });
    }

    // For development, handle temp seller ID without ObjectId validation
    if (sellerId === 'temp-seller-id') {
      return NextResponse.json(
        { error: 'Cannot create products with temporary seller ID' },
        { status: 400 }
      );
    }

    // Validate seller exists
    const seller = await Seller.findById(sellerId);
    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    // Handle FormData (for file uploads)
    const contentType = request.headers.get('content-type');
    let body;
    
    if (contentType && contentType.includes('multipart/form-data')) {
      // Handle FormData with file uploads
      const formData = await request.formData();
      
      // Extract form fields
      body = {
        name: formData.get('name'),
        sku: formData.get('sku'),
        description: formData.get('description'),
        category: formData.get('category'),
        price: formData.get('price'),
        stockQuantity: formData.get('stockQuantity'),
        reorderThreshold: formData.get('reorderThreshold'),
        tags: JSON.parse(formData.get('tags') as string || '[]'),
        dimensions: JSON.parse(formData.get('dimensions') as string || '{}'),
        images: [] as string[]
      };
      
      // Handle image files
      const imageFiles = formData.getAll('images') as File[];
      console.log('Received image files:', imageFiles.length);
      
      // For now, just log the files - in production, you'd upload to cloud storage
      // and store the URLs in the images array
      
    } else {
      // Handle regular JSON (no file uploads)
      body = await request.json();
    }

    const {
      name,
      sku,
      description,
      category,
      subcategory,
      tags,
      price,
      comparePrice,
      costPrice,
      stockQuantity,
      reorderThreshold,
      reorderLevel,
      maxStock,
      dimensions,
      specifications,
      images,
      seo
    } = body;

    // Validate required fields
    if (!name || !sku || !description || !category || !price || stockQuantity === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, sku, description, category, price, stockQuantity' },
        { status: 400 }
      );
    }

    // Check if SKU already exists
    const existingProduct = await Product.findOne({ sku });
    if (existingProduct) {
      return NextResponse.json(
        { error: 'Product with this SKU already exists' },
        { status: 409 }
      );
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');

    // Create new product
    const product = new Product({
      sellerId,
      name,
      sku,
      slug,
      description,
      category,
      subcategory,
      tags: tags || [],
      price,
      comparePrice,
      costPrice,
      stockQuantity,
      reorderThreshold: reorderThreshold || 5,
      reorderLevel: reorderLevel || 10,
      maxStock: maxStock || 1000,
      dimensions: dimensions || {},
      specifications: specifications || {},
      images: images || [],
      status: 'draft',
      featured: false,
      seo: seo || {},
      salesData: {
        totalSold: 0,
        totalRevenue: 0,
        averageRating: 0,
        reviewCount: 0,
        viewCount: 0
      }
    });

    await product.save();

    console.log('✅ Product created:', { id: product._id, sku, name });

    return NextResponse.json({
      message: 'Product created successfully',
      product
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creating product:', error);
    
    // Handle duplicate key errors
    if (error instanceof Error && 'code' in error && error.code === 11000) {
      const field = Object.keys((error as any).keyValue)[0];
      return NextResponse.json(
        { error: `A product with this ${field} already exists` },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
