import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import { LandDetails } from '../../../../lib/models/LandDetails';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { ObjectId } from 'mongodb';

// GET - Fetch all land details for a user
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const landDetails = await LandDetails.find({ userId }).sort({ createdAt: -1 });
    
    return NextResponse.json({ 
      success: true, 
      data: landDetails,
      count: landDetails.length 
    });
  } catch (error) {
    console.error('Error fetching land details:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch land details' 
    }, { status: 500 });
  }
}

// POST - Create or update land details (upsert)
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const formData = await request.formData();
    
    const userId = formData.get('userId') as string;
    const centroidLatitude = parseFloat(formData.get('centroidLatitude') as string);
    const centroidLongitude = parseFloat(formData.get('centroidLongitude') as string);
    const sideLengths = JSON.parse(formData.get('sideLengths') as string);
    const vertices = JSON.parse(formData.get('vertices') as string);
    const geojson = formData.get('geojson') as string;
    
    // RTC details are now optional - only get them if provided
    const surveyNumber = formData.get('surveyNumber') as string || '';
    const extent = formData.get('extent') as string || '';
    const location = formData.get('location') as string || '';
    const taluk = formData.get('taluk') as string || '';
    const hobli = formData.get('hobli') as string || '';
    const village = formData.get('village') as string || '';
    const soilType = formData.get('soilType') as string || '';
    const cropType = formData.get('cropType') as string || '';
    
    const sketchImage = formData.get('sketchImage') as File;
    
    console.log('Received land details data:', {
      userId,
      centroidLatitude,
      centroidLongitude,
      sideLengthsCount: sideLengths?.length,
      verticesCount: vertices?.length,
      hasImage: !!sketchImage
    });
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Convert userId string to ObjectId
    let userObjectId;
    try {
      userObjectId = new ObjectId(userId);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid User ID format' }, { status: 400 });
    }

    // Handle image upload
    let imageData = null;
    if (sketchImage && sketchImage.size > 0) {
      const bytes = await sketchImage.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Create uploads directory if it doesn't exist
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'land-sketches');
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }
      
      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${userId}_${timestamp}_${sketchImage.name}`;
      const filepath = join(uploadsDir, filename);
      
      // Write file
      await writeFile(filepath, buffer);
      
      imageData = {
        filename: filename,
        originalName: sketchImage.name,
        path: `/uploads/land-sketches/${filename}`,
        size: sketchImage.size,
        mimeType: sketchImage.type,
        uploadedAt: new Date()
      };
    }

    // Calculate land size from RTC extent format (00.00.00.00)
    let landSizeInAcres = 0;
    console.log('RTC extent received:', extent);
    if (extent) {
      const parts = extent.split('.');
      console.log('Extent parts:', parts);
      if (parts.length >= 2) {
        const acres = parseFloat(parts[0]) || 0;
        const guntes = parseFloat(parts[1]) || 0;
        console.log('Acres:', acres, 'Guntes:', guntes);
        // Convert guntes to acres (1 acre = 40 guntes)
        landSizeInAcres = acres + (guntes / 40);
        console.log('Calculated land size in acres:', landSizeInAcres);
      } else {
        console.log('Extent format is invalid, expected at least 2 parts');
      }
    } else {
      console.log('No extent provided for land size calculation');
    }

    // Check if land details already exist for this user
    const existingLandDetails = await LandDetails.findOne({ user: userObjectId });
    
    // Create land details record with optional RTC details
    const landDetailsData: any = {
      user: userObjectId, // Use ObjectId instead of string
      userId: userId,     // Keep string for easier lookup
      sketchImage: imageData || existingLandDetails?.sketchImage, // Keep existing image if no new one
      landData: {
        centroidLatitude,
        centroidLongitude,
        sideLengths,
        vertices,
        landSizeInAcres, // Use RTC land size instead of calculated area
        geojson
      },
      processingStatus: 'completed',
      processedAt: new Date()
    };

    // Only add rtcDetails if any RTC fields are provided or keep existing
    if (surveyNumber || extent || location || taluk || hobli || village || soilType || cropType) {
      landDetailsData.rtcDetails = {
        surveyNumber,
        extent,
        location,
        taluk,
        hobli,
        village,
        soilType,
        cropType
      };
    } else if (existingLandDetails?.rtcDetails) {
      landDetailsData.rtcDetails = existingLandDetails.rtcDetails;
    }

    let landDetails;
    if (existingLandDetails) {
      // Update existing record
      Object.assign(existingLandDetails, landDetailsData);
      landDetails = await existingLandDetails.save();
      console.log('Land details updated successfully:', landDetails._id);
    } else {
      // Create new record
      landDetails = new LandDetails(landDetailsData);
      await landDetails.save();
      console.log('Land details created successfully:', landDetails._id);
    }

    return NextResponse.json({ 
      success: true, 
      data: landDetails,
      message: existingLandDetails ? 'Land details updated successfully' : 'Land details saved successfully'
    });
  } catch (error) {
    console.error('Error saving land details:', error);
    return NextResponse.json({ 
      error: 'Failed to save land details: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}

// PUT - Update existing land details
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { id, userId, ...updateData } = body;
    
    if (!id || !userId) {
      return NextResponse.json({ error: 'Land details ID and User ID are required' }, { status: 400 });
    }

    const landDetails = await LandDetails.findOneAndUpdate(
      { _id: id, userId },
      { 
        ...updateData,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!landDetails) {
      return NextResponse.json({ error: 'Land details not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data: landDetails,
      message: 'Land details updated successfully' 
    });
  } catch (error) {
    console.error('Error updating land details:', error);
    return NextResponse.json({ 
      error: 'Failed to update land details' 
    }, { status: 500 });
  }
}

// DELETE - Delete land details
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    
    if (!id || !userId) {
      return NextResponse.json({ error: 'Land details ID and User ID are required' }, { status: 400 });
    }

    const landDetails = await LandDetails.findOneAndDelete({ _id: id, userId });

    if (!landDetails) {
      return NextResponse.json({ error: 'Land details not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Land details deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting land details:', error);
    return NextResponse.json({ 
      error: 'Failed to delete land details' 
    }, { status: 500 });
  }
}
