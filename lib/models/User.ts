import mongoose, { Schema, Document, Model } from 'mongoose';

export type UserRole = 'farmer' | 'supplier';

export interface IUser extends Document {
  role: UserRole;
  fullName?: string; // farmer
  email: string;
  phone?: string; // farmer
  companyName?: string; // supplier
  businessEmail?: string; // supplier (can reuse email too)
  upiId?: string; // supplier
  passwordHash: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  emailOtp?: string;
  phoneOtp?: string;
  otpExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    role: { type: String, enum: ['farmer', 'supplier'], required: true },
    fullName: { type: String },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    companyName: { type: String },
    businessEmail: { type: String },
    upiId: { type: String },
    passwordHash: { type: String, required: true },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    emailOtp: { type: String },
    phoneOtp: { type: String },
    otpExpiresAt: { type: Date },
  },
  { timestamps: true }
);

export const User =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
