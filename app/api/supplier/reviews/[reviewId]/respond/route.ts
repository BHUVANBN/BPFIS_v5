import { NextRequest, NextResponse } from 'next/server';
import { Review } from '@/lib/models/review';
import { connectDB } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: { reviewId: string } }
) {
  try {
    const { reviewId } = params;
    const sellerId = request.headers.get('x-seller-id');
    
    if (!sellerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { response } = body;

    if (!response || response.trim().length === 0) {
      return NextResponse.json({ error: 'Response text is required' }, { status: 400 });
    }

    await connectDB();

    // Find and update the review
    const review = await Review.findOneAndUpdate(
      { 
        _id: reviewId,
        ...(sellerId !== 'temp-seller-id' && { sellerId })
      },
      { 
        sellerResponse: response,
        sellerRespondedAt: new Date(),
        status: 'responded'
      },
      { new: true }
    );

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Review response submitted successfully',
      review: {
        id: review._id,
        sellerResponse: response,
        sellerRespondedAt: new Date(),
        status: 'responded'
      }
    });
  } catch (error) {
    console.error('Error responding to review:', error);
    return NextResponse.json({ error: 'Failed to respond to review' }, { status: 500 });
  }
}
