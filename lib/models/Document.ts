import mongoose, { Document, Schema } from 'mongoose';

export interface IDocument extends Document {
  owner: mongoose.Types.ObjectId;
  type: 'rtc' | 'aadhaar' | 'other';
  originalName?: string;
  mimeType?: string;
  size?: number;
  path: string;
  cid?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['rtc', 'aadhaar', 'other'], required: true, index: true },
    originalName: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    path: { type: String, required: true },
    cid: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Document || mongoose.model<IDocument>('Document', DocumentSchema);
