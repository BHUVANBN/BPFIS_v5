import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Order } from '@/lib/models/supplier';
import { FarmerOrder as FarmerOrderModel } from '@/lib/models/FarmerOrder';
import { requireAuth } from '@/lib/supplier-auth-middleware';
import mongoose, { Types } from 'mongoose';

interface SupplierOrder {
  _id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  items: any[];
  createdAt: Date;
  source: 'supplier' | 'farmer';
}

interface FarmerOrderItem {
  sellerId: Types.ObjectId | string | null;
  productId: Types.ObjectId | string | null;
  quantity: number;
  price: number;
  [key: string]: any; // For any additional properties
}

interface FarmerOrder {
  _id: Types.ObjectId;
  orderNumber: string;
  items: FarmerOrderItem[];
  status: string;
  createdAt: Date;
  [key: string]: any; // For any additional properties
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ supplierId: string }> }
) {
  try {
    await connectDB();
    
    // Authenticate supplier and validate supplierId
    const resolvedParams = await params;
    const auth = await requireAuth(request, { params: resolvedParams });
    const sellerId = auth.sellerId;
    const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build query for supplier orders
    const supplierQuery: any = { sellerId: sellerObjectId };
    
    if (status && status !== 'all') {
      supplierQuery.orderStatus = status;
    }
    
    if (search) {
      supplierQuery.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } }
      ];
    }

    // Get supplier orders
    const supplierOrders = await Order.find(supplierQuery)
      .sort({ createdAt: -1 })
      .populate('items.productId', 'name sku images')
      .lean();

    // Build query for farmer orders
    const farmerQuery: any = {
      'items.sellerId': { $in: [sellerId, sellerObjectId.toString()] }
    };
    
    if (status && status !== 'all') {
      // Map supplier order status to farmer order status
      const statusMap: Record<string, string> = {
        'new': 'confirmed',
        'processing': 'processing',
        'shipped': 'shipped',
        'delivered': 'delivered',
        'cancelled': 'cancelled'
      };
      farmerQuery.status = statusMap[status] || status;
    }
    
    if (search) {
      farmerQuery.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'shipping.name': { $regex: search, $options: 'i' } },
        { 'shipping.phone': { $regex: search, $options: 'i' } }
      ];
    }

    // Get farmer orders
    console.log('Fetching farmer orders for sellerId:', sellerId);
    const farmerOrders = await FarmerOrderModel.find(farmerQuery)
      .sort({ createdAt: -1 })
      .lean<FarmerOrder[]>();

    console.log('Found farmer orders:', farmerOrders.length);
    farmerOrders.forEach((order: FarmerOrder) => {
      console.log(`Farmer order ${order.orderNumber}: items with sellerId:`, 
        order.items.filter((item: FarmerOrderItem) => 
          item.sellerId?.toString() === sellerId || 
          item.sellerId?.toString() === sellerObjectId.toString()
        ).length
      );
    });

    // Combine and format orders
    const allOrders: SupplierOrder[] = [
      ...supplierOrders.map((order: any): SupplierOrder => ({
        _id: order._id.toString(),
        orderNumber: order.orderNumber,
        customerName: order.customer?.name || 'Customer',
        customerPhone: order.customer?.phone || '',
        totalAmount: order.totalAmount,
        status: order.orderStatus,
        paymentStatus: order.paymentStatus || 'pending',
        items: order.items,
        createdAt: order.createdAt,
        source: 'supplier'
      })),
      ...farmerOrders
        .map((order: FarmerOrder): SupplierOrder | null => {
          // Filter items for this supplier only
          const supplierItems = order.items.filter((item: FarmerOrderItem) => 
            item.sellerId?.toString() === sellerId || 
            item.sellerId?.toString() === sellerObjectId.toString()
          );
          
          if (supplierItems.length === 0) return null;
          
          const supplierTotal = supplierItems.reduce(
            (sum: number, item: FarmerOrderItem) => sum + (item.price * item.quantity), 
            0
          );
          
          // Map farmer order status to supplier order status
          const statusMap: Record<string, string> = {
            'confirmed': 'new',
            'processing': 'processing',
            'shipped': 'shipped',
            'delivered': 'delivered',
            'cancelled': 'cancelled'
          };
          
          return {
            _id: order._id.toString(),
            orderNumber: order.orderNumber,
            customerName: (order as any).shipping?.name || 'Customer',
            customerPhone: (order as any).shipping?.phone || '',
            totalAmount: supplierTotal,
            status: statusMap[order.status] || order.status,
            paymentStatus: (order as any).paymentStatus || 'pending',
            items: supplierItems,
            createdAt: order.createdAt,
            source: 'farmer'
          };
        })
        .filter((order: SupplierOrder | null): order is SupplierOrder => order !== null)
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply pagination
    const total = allOrders.length;
    const paginatedOrders = allOrders.slice(skip, skip + limit);

    return NextResponse.json({
      orders: paginatedOrders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ supplierId: string }> }
) {
  try {
    await connectDB();
    
    // Authenticate supplier and validate supplierId
    const resolvedParams = await params;
    const auth = await requireAuth(request, { params: resolvedParams });
    const sellerId = auth.sellerId;

    const body = await request.json();

    // Create order
    const order = await Order.create({
      ...body,
      sellerId,
      orderNumber: generateOrderNumber()
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

function generateOrderNumber(): string {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}-${random}`;
}
