import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Seller } from '@/lib/models/supplier';
import { Order } from '@/lib/models/supplier';
import { Types } from 'mongoose';

interface SupplierType {
  _id: Types.ObjectId;
  name?: string;
  email: string;
  phone?: string;
  companyName?: string;
  gstNumber?: string;
  verificationStatus?: string;
  createdAt: Date;
  documents?: any[];
  // Add other fields as needed
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('search') || '';
    const filter = searchParams.get('status') || 'all';
    
    // Build query based on filters
    let supplierQuery: any = {};
    
    if (searchTerm) {
      supplierQuery.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { companyName: { $regex: searchTerm, $options: 'i' } }
      ];
    }
    
    if (filter !== 'all') {
      supplierQuery.verificationStatus = filter;
    }
    
    // Get suppliers with additional info
    const suppliers = await Seller.find(supplierQuery)
      .select('name email phone companyName gstNumber verificationStatus createdAt documents')
      .sort({ createdAt: -1 })
      .lean();
    
    // Get products count and revenue for each supplier
    const suppliersWithStats = await Promise.all(
      suppliers.map(async (supplier: SupplierType) => {
        const productsCount = await require('@/lib/models/supplier').Product.countDocuments({ 
          sellerId: supplier._id 
        });
        
        const revenueData = await Order.aggregate([
          { $match: { sellerId: supplier._id, paymentStatus: 'paid' } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        
        return {
          ...supplier,
          productsCount,
          totalRevenue: revenueData[0]?.total || 0,
          documents: {
            businessLicense: (supplier.documents as any)?.businessLicense?.status || 'pending',
            gstCertificate: (supplier.documents as any)?.gstCertificate?.status || 'pending',
            bankDetails: (supplier.documents as any)?.bankDetails?.status || 'pending'
          }
        };
      })
    );

    // Add pagination
    const total = await Seller.countDocuments(supplierQuery);
    
    return NextResponse.json({ 
      data: suppliersWithStats,
      pagination: {
        page: 1,
        limit: suppliersWithStats.length,
        total: total,
        totalPages: Math.ceil(total / suppliersWithStats.length)
      }
    });
    
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 }
    );
  }
}
