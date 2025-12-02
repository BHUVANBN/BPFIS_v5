"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function ProductDetailPage() {
  const params = useParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1f3b2c]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Product Details</h2>
          <p className="text-gray-600 mb-8">Product ID: {params.id}</p>
          <Link 
            href="/dashboard/farmer/marketplace"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#1f3b2c] hover:bg-[#2d4f3c]"
          >
            Back to Marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}
