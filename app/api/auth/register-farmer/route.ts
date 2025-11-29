import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '../../../../lib/db';
import { User } from '../../../../lib/models/User';
import { sendEmailOtp } from '../../../../lib/otpEmail';
import { sendSmsOtp } from '../../../../lib/otpSms';

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, email, phone, password } = body;

    if (!fullName || !email || !phone || !password) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { message: 'Email already registered' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await User.create({
      role: 'farmer',
      fullName,
      email,
      phone,
      passwordHash,
      emailVerified: false,
      phoneVerified: false,
      emailOtp: otp,
      phoneOtp: otp,
      otpExpiresAt,
    });

    // Fire-and-forget OTP delivery
    void sendEmailOtp(user.email, otp, 'farmer registration');
    if (user.phone) {
      void sendSmsOtp(user.phone, otp, 'farmer registration');
    }

    return NextResponse.json({
      message: 'Farmer registered. Verify OTP to activate account.',
      userId: user._id,
      // For local debugging, also include OTP in the response.
      otp,
    });
  } catch (error) {
    console.error('register-farmer error', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
