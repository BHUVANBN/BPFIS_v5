import { NextRequest, NextResponse } from 'next/server';
import { Review } from '@/lib/models/review';
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
      ? {} // For development, fetch all reviews
      : { sellerId };

    if (status && status !== 'all') {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } },
        { comment: { $regex: search, $options: 'i' } }
      ];
    }

    // Fetch reviews from database
    const reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const total = await Review.countDocuments(query);

    return NextResponse.json({
      reviews,
      total,
      page: 1,
      totalPages: Math.ceil(total / 50)
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}
