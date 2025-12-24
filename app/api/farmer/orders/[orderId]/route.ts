import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { FarmerOrder } from '@/lib/models/FarmerOrder'
import mongoose, { Document, Types } from 'mongoose'

interface IFarmerOrder extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId | string;
  user?: Types.ObjectId | string;
  orderNumber: string;
  status: string;
  // Add other fields as needed
  [key: string]: any; // For any additional dynamic properties
}

// Order details API with realistic status tracking
export async function GET(req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    
    // Extract orderId from URL path since params might be empty
    const urlParts = req.url.split('/')
    const orderId = urlParts[urlParts.length - 1].split('?')[0]

    // Debug: Log the parameters
    console.log('API called with:', { userId, orderId, params, url: req.url })

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    await connectDB()

    // Find order using string comparison approach
    const allUserOrders = await FarmerOrder.find({ 
      $or: [{ userId }, { user: userId }]
    }).lean()
    
    console.log(`Found ${allUserOrders.length} orders for user`)
    
    const order = allUserOrders.find((o: IFarmerOrder) => {
      const orderIdStr = o._id.toString()
      const matches = orderIdStr === orderId
      console.log(`Comparing: "${orderIdStr}" with "${orderId}" -> ${matches}`)
      return matches
    })

    if (!order) {
      console.log('Order not found after comparison')
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    console.log('Order found successfully:', order.orderNumber)

    // Initialize tracking and statusHistory if they don't exist (for backward compatibility)
    let updatedOrder = { ...order }
    if (!updatedOrder.tracking) {
      updatedOrder.tracking = {}
    }
    if (!updatedOrder.statusHistory) {
      updatedOrder.statusHistory = [{
        status: updatedOrder.status || 'confirmed',
        timestamp: updatedOrder.createdAt,
        note: 'Order confirmed'
      }]
    }

    // Simulate order status progression based on time elapsed
    const now = new Date()
    const orderDate = new Date(order.createdAt)
    const hoursElapsed = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60)

    // Update status based on time elapsed (simulating realistic e-commerce timeline)
    if (updatedOrder.status !== 'cancelled') {
      if (hoursElapsed > 72 && updatedOrder.status === 'shipped') {
        // After 3 days, mark as delivered (only if currently shipped)
        updatedOrder.status = 'delivered'
        updatedOrder.tracking.actualDelivery = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000)
        updatedOrder.tracking.deliveredAt = updatedOrder.tracking.actualDelivery
        updatedOrder.tracking.currentLocation = 'Delivered'
        updatedOrder.statusHistory.push({
          status: 'delivered',
          timestamp: updatedOrder.tracking.actualDelivery,
          note: 'Order successfully delivered'
        })
      } else if (hoursElapsed > 24 && updatedOrder.status === 'confirmed') {
        // After 1 day, mark as processing
        updatedOrder.status = 'processing'
        updatedOrder.statusHistory.push({
          status: 'processing',
          timestamp: new Date(now.getTime() - Math.random() * 12 * 60 * 60 * 1000),
          note: 'Order is being processed'
        })
      } else if (hoursElapsed > 48 && updatedOrder.status === 'processing') {
        // After 2 days, mark as shipped
        updatedOrder.status = 'shipped'
        updatedOrder.tracking.shippedAt = new Date(now.getTime() - Math.random() * 12 * 60 * 60 * 1000)
        updatedOrder.tracking.currentLocation = 'In Transit'
        updatedOrder.statusHistory.push({
          status: 'shipped',
          timestamp: updatedOrder.tracking.shippedAt,
          note: 'Order has been shipped'
        })
        if (!updatedOrder.tracking.estimatedDelivery) {
          const estimatedDelivery = new Date(orderDate)
          estimatedDelivery.setDate(estimatedDelivery.getDate() + Math.floor(Math.random() * 3) + 3)
          updatedOrder.tracking.estimatedDelivery = estimatedDelivery
        }
        
        updatedOrder.statusHistory.push({
          status: 'processing',
          timestamp: new Date(orderDate.getTime() + 12 * 60 * 60 * 1000),
          note: 'Order being prepared for shipment'
        })
      }

      // Update the database if status changed
      if (updatedOrder.status !== order.status) {
        await FarmerOrder.updateOne(
          { _id: orderId },
          { 
            $set: {
              status: updatedOrder.status,
              tracking: updatedOrder.tracking,
              paymentStatus: updatedOrder.paymentStatus,
              statusHistory: updatedOrder.statusHistory
            }
          }
        )
      }
    }

    return NextResponse.json({ order: updatedOrder })
  } catch (err) {
    console.error('GET /api/farmer/orders/[orderId] error:', err)
    return NextResponse.json({ error: 'Failed to load order' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    
    // Extract orderId from URL path since params might be empty
    const urlParts = req.url.split('/')
    const orderId = urlParts[urlParts.length - 1].split('?')[0]
    
    const body = await req.json()
    const { action } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    await connectDB()

    // Find order using string comparison approach
    const allUserOrders = await FarmerOrder.find({ 
      $or: [{ userId }, { user: userId }]
    }).lean()
    
    const order = allUserOrders.find((o: IFarmerOrder) => o._id.toString() === orderId)

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (action === 'cancel') {
      if (['shipped', 'delivered'].includes(order.status)) {
        return NextResponse.json({ error: 'Cannot cancel order that has been shipped' }, { status: 400 })
      }

      const { reason } = body
      if (!reason) {
        return NextResponse.json({ error: 'Cancellation reason is required' }, { status: 400 })
      }

      await FarmerOrder.updateOne(
        { _id: orderId },
        { 
          $set: { 
            status: 'cancelled',
            paymentStatus: 'refunded'
          },
          $push: {
            statusHistory: {
              status: 'cancelled',
              timestamp: new Date(),
              note: `Order cancelled: ${reason}`
            }
          }
        }
      )

      return NextResponse.json({ message: 'Order cancelled successfully' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error('POST /api/farmer/orders/[orderId] error:', err)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
