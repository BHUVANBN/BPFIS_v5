import { NextResponse } from 'next/server';
import { extractTokenFromRequest, verifyAuthToken } from '@/lib/auth';

// GET /api/supplier/documents - List all documents for the authenticated supplier
export async function GET(request: Request) {
  try {
    const token = extractTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await verifyAuthToken(token);
    if (!user || user.role !== 'supplier') {
      return NextResponse.json(
        { error: 'Access denied. Supplier role required.' },
        { status: 403 }
      );
    }

    // TODO: Implement actual document listing logic here
    // This is a placeholder response
    return NextResponse.json([]);
  } catch (error) {
    console.error('Failed to fetch supplier documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier documents' },
      { status: 500 }
    );
  }
}

// POST /api/supplier/documents - Upload a new document
export async function POST(request: Request) {
  try {
    const token = extractTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await verifyAuthToken(token);
    if (!user || user.role !== 'supplier') {
      return NextResponse.json(
        { error: 'Access denied. Supplier role required.' },
        { status: 403 }
      );
    }

    // TODO: Implement actual document upload logic here
    // This is a placeholder response
    return NextResponse.json(
      { message: 'Document uploaded successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to upload document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}