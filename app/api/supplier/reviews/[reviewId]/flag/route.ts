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

    await connectDB();

    // Find and update the review
    const review = await Review.findOneAndUpdate(
      { 
        _id: reviewId,
        ...(sellerId !== 'temp-seller-id' && { sellerId })
      },
      { 
        flagged: true,
        flaggedAt: new Date(),
        flaggedBy: 'seller'
      },
      { new: true }
    );

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Review flagged successfully',
      review: {
        id: review._id,
        flagged: true,
        flaggedAt: new Date(),
        flaggedBy: 'seller'
      }
    });
  } catch (error) {
    console.error('Error flagging review:', error);
    return NextResponse.json({ error: 'Failed to flag review' }, { status: 500 });
  }
}
