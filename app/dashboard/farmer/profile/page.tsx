"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function FarmerProfilePage() {
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/farmer/kyc');
        const data = await res.json();
        if (!res.ok) {
          setError(data.message || 'Failed to load profile');
        } else {
          setProfile(data.profile);
        }
      } catch (err) {
        setError('Something went wrong');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  return (
    <div className="space-y-6 text-xs md:text-sm">
      <h1 className="text-xl font-semibold text-[#1f3b2c] mb-2">My Profile</h1>

      {loading && <p className="text-[#6b7280]">Loading profile…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {profile && (
        <>
          <section className="bg-[#fffaf1] border border-[#e2d4b7] rounded-lg p-6 space-y-2">
            <h2 className="text-sm font-semibold text-[#1f3b2c] mb-2">Farmer Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="text-[#1f3b2c]"><span className="font-semibold">Aadhaar Name: </span>{profile.aadhaarKannadaName || profile.verifiedName || '—'}</div>
              <div className="text-[#1f3b2c]"><span className="font-semibold">Age &amp; Gender: </span>{profile.age ? `${profile.age}, ` : ''}{profile.gender || '' || '—'}</div>
              <div className="text-[#1f3b2c]"><span className="font-semibold">Home Address: </span>{profile.homeAddress || '—'}</div>
              <div className="text-[#1f3b2c]"><span className="font-semibold">ID Proof: </span>{profile.idProof || '—'}</div>
              <div className="text-[#1f3b2c]"><span className="font-semibold">Contact Number: </span>{profile.contactNumber || '—'}</div>
              <div className="text-[#1f3b2c]"><span className="font-semibold">Date of Birth: </span>{profile.dob || '—'}</div>
              {profile.nameVerificationStatus && (
                <div className="text-[#1f3b2c]">
                  <span className="font-semibold">Name Verification: </span>
                  <span className={`font-bold ${
                    profile.nameVerificationStatus === 'verified' ? 'text-green-700' :
                    profile.nameVerificationStatus === 'not_verified' ? 'text-red-700' :
                    'text-yellow-700'
                  }`}>
                    {profile.nameVerificationStatus === 'verified' ? '✅ Verified' :
                     profile.nameVerificationStatus === 'not_verified' ? '❌ Not Verified' :
                     '⏳ Pending'}
                  </span>
                </div>
              )}
            </div>
          </section>

          <section className="bg-[#fffaf1] border border-[#e2d4b7] rounded-lg p-6 space-y-2">
            <h2 className="text-sm font-semibold text-[#1f3b2c] mb-2">Aadhaar Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="text-[#1f3b2c]"><span className="font-semibold">Aadhaar Number: </span>{profile.idProof || '—'}</div>
              <div className="text-[#1f3b2c]"><span className="font-semibold">Mobile Number: </span>{profile.contactNumber || '—'}</div>
              <div className="text-[#1f3b2c]"><span className="font-semibold">Date of Birth: </span>{profile.dob || '—'}</div>
              <div className="text-[#1f3b2c]"><span className="font-semibold">Gender: </span>{profile.gender || '—'}</div>
              <div className="text-[#1f3b2c]"><span className="font-semibold">Address: </span>{profile.homeAddress || '—'}</div>
            </div>
          </section>

          {/* Land Details Section */}
          <section className="bg-[#fffaf1] border border-[#e2d4b7] rounded-lg p-6 space-y-2">
            <h2 className="text-sm font-semibold text-[#1f3b2c] mb-2">Land Details</h2>
            {profile.nameVerificationStatus === 'verified' && profile.landParcelIdentity ? (
              // Show land details if names matched and RTC data is available
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="text-[#1f3b2c]"><span className="font-semibold">Survey Number: </span>{profile.landParcelIdentity || '—'}</div>
                <div className="text-[#1f3b2c]"><span className="font-semibold">Total Area: </span>{profile.totalCultivableArea || '—'}</div>
                <div className="text-[#1f3b2c]"><span className="font-semibold">Soil Type: </span>{profile.soilProperties || '—'}</div>
                <div className="text-[#1f3b2c]"><span className="font-semibold">Mutation: </span>{profile.mutationTraceability || '—'}</div>
                {profile.rtcAddress && (
                  <div className="text-[#1f3b2c]"><span className="font-semibold">Land Location: </span>{profile.rtcAddress}</div>
                )}
                <div className="text-[#1f3b2c]">
                  <span className="font-semibold">Ownership Verified: </span>
                  <span className="font-bold text-green-700">✅ Yes</span>
                </div>
              </div>
            ) : (
              // Show upload button if names don't match or no RTC data
              <div className="text-center py-4">
                <p className="text-[#1f3b2c] mb-4">
                  {profile.nameVerificationStatus === 'not_verified' 
                    ? 'Names did not match. Please upload matching RTC and Aadhaar documents to view land details.'
                    : 'No land details available. Please upload your RTC document.'}
                </p>
                <button
                  onClick={() => router.push('/dashboard/farmer/documents')}
                  className="inline-flex items-center rounded-md bg-[#166534] px-4 py-2 text-xs font-medium text-white hover:bg-[#14532d]"
                >
                  Upload RTC Document
                </button>
              </div>
            )}
          </section>

          <section className="bg-[#fffaf1] border border-[#e2d4b7] rounded-lg p-6 space-y-3">
            <h2 className="text-sm font-semibold text-[#1f3b2c] mb-2">Uploaded Documents</h2>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[#1f3b2c]">RTC Document</span>
                <span className={`px-2 py-1 rounded-full text-[11px] ${profile.rtcOcrText ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                  {profile.rtcOcrText ? 'Uploaded' : 'Not Uploaded'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#1f3b2c]">Aadhaar Document</span>
                <span className={`px-2 py-1 rounded-full text-[11px] ${profile.aadharOcrText ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                  {profile.aadharOcrText ? 'Uploaded' : 'Not Uploaded'}
                </span>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
