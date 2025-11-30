import { NextResponse } from 'next/server';
import { Seller } from '@/lib/models/seller';
import { connectDB } from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET /api/supplier - Get current supplier profile
export async function GET(request: Request) {
  try {
    await connectDB();
    
    // Get seller ID from session/auth (simplified for now)
    const sellerId = request.headers.get('x-seller-id');
    if (!sellerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For development, handle temp seller ID by checking database
    if (sellerId === 'temp-seller-id') {
      // Try to find the demo seller in database
      const seller = await Seller.findOne({ email: 'demo@agrilink.com' }).select('-passwordHash');
      
      if (!seller) {
        // No seller found, needs setup
        return NextResponse.json({ 
          seller: null,
          needsSetup: true,
          message: 'Profile setup required'
        });
      }
      
      // Seller found, return data
      return NextResponse.json({ 
        seller: seller,
        needsSetup: false,
        message: 'Profile loaded from database'
      });
    }

    const seller = await Seller.findById(sellerId).select('-passwordHash');
    if (!seller) {
      return NextResponse.json({ 
        seller: null,
        needsSetup: true,
        message: 'Profile not found - setup required'
      }, { status: 404 });
    }

    return NextResponse.json({ seller, needsSetup: false });
  } catch (error) {
    console.error('Error fetching seller:', error);
    return NextResponse.json({ error: 'Failed to fetch seller' }, { status: 500 });
  }
}

// POST /api/supplier - Create new seller account
export async function POST(request: Request) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { companyName, email, phone, password, address, gstNumber } = body;

    // Validate required fields
    if (!companyName || !email || !phone || !password || !address) {
      return NextResponse.json({ 
        error: 'Missing required fields: companyName, email, phone, password, address' 
      }, { status: 400 });
    }

    // Check if seller already exists
    const existingSeller = await Seller.findOne({ email });
    if (existingSeller) {
      return NextResponse.json({ error: 'Seller with this email already exists' }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new seller
    const seller = new Seller({
      companyName,
      email,
      phone,
      password: hashedPassword,
      address,
      gstNumber,
      verificationStatus: 'pending'
    });

    await seller.save();

    // Remove password from response
    const sellerResponse = seller.toObject();
    delete sellerResponse.password;

    return NextResponse.json({ 
      message: 'Seller account created successfully',
      seller: sellerResponse
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating seller:', error);
    return NextResponse.json({ error: 'Failed to create seller account' }, { status: 500 });
  }
}

// PUT /api/supplier - Update seller profile
export async function PUT(request: Request) {
  try {
    await connectDB();
    
    // Get seller ID from session/auth
    const sellerId = request.headers.get('x-seller-id');
    if (!sellerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { gstNumber, businessDetails, address, isFirstTimeSetup } = body;

    // For development, handle temp seller ID by creating/updating real record
    if (sellerId === 'temp-seller-id') {
      // Try to find existing seller with temp ID or create new one
      let seller = await Seller.findOne({ email: 'demo@agrilink.com' });
      
      if (!seller) {
        // Create new seller for development
        seller = new Seller({
          companyName: 'Demo Agricultural Supplies',
          email: 'demo@agrilink.com',
          phone: '+91 98765 43210',
          password: 'demo123', // Will be hashed
          address: address || {
            street: '123 Farm Road',
            city: 'Bangalore',
            state: 'Karnataka',
            pincode: '560001',
            country: 'India'
          },
          gstNumber,
          businessDetails,
          verificationStatus: 'pending',
          documents: {},
          isActive: true,
          createdAt: new Date()
        });
        
        // Hash password
        if (seller.password) {
          seller.passwordHash = await bcrypt.hash(seller.password, 10);
          delete seller.password;
        }
        
        await seller.save();
      } else {
        // Update existing seller
        if (gstNumber) seller.gstNumber = gstNumber;
        if (businessDetails) seller.businessDetails = businessDetails;
        if (address) seller.address = { ...seller.address, ...address };
        seller.updatedAt = new Date();
        
        await seller.save();
      }

      const sellerResponse = seller.toObject();
      delete sellerResponse.passwordHash;

      return NextResponse.json({ 
        message: isFirstTimeSetup ? 'Profile setup completed successfully' : 'Profile updated successfully',
        seller: sellerResponse
      });
    }

    // Check if this is first-time setup
    const existingSeller = await Seller.findById(sellerId);
    if (!existingSeller && isFirstTimeSetup) {
      // Create new seller profile for first-time setup
      const seller = new Seller({
        companyName: 'From Registration', // This would come from registration
        phone: 'From Registration',
        address: address || {
          street: 'From Registration',
          city: 'From Registration',
          state: 'From Registration',
          pincode: 'From Registration',
          country: 'India'
        },
        gstNumber,
        businessDetails,
        verificationStatus: 'pending',
        isActive: true
      });

      await seller.save();

      return NextResponse.json({ 
        message: 'Profile setup completed successfully',
        seller: seller.toObject()
      }, { status: 201 });
    }

    // Find and update existing seller
    const seller = await Seller.findByIdAndUpdate(
      sellerId,
      {
        ...(gstNumber !== undefined && { gstNumber }),
        ...(businessDetails && { businessDetails }),
        ...(address && { address })
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Profile updated successfully',
      seller
    });
  } catch (error) {
    console.error('Error updating seller profile:', error);
    return NextResponse.json({ 
      error: 'Failed to update profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
