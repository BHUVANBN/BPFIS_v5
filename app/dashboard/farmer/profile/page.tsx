"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function FarmerProfilePage() {
  const [profile, setProfile] = useState<any | null>(null);
  const [landDetails, setLandDetails] = useState<any | null>(null);
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

  useEffect(() => {
    async function loadLandDetails() {
      try {
        // Get current logged-in user ID
        const authResponse = await fetch('/api/auth/me');
        if (authResponse.ok) {
          const userData = await authResponse.json();
          const userId = userData.user?.id || userData.user?._id;
          
          if (userId) {
            const res = await fetch(`/api/farmer/land-details?userId=${userId}`);
            const data = await res.json();
            if (res.ok) {
              setLandDetails(data.data && data.data.length > 0 ? data.data[0] : null);
            }
          }
        } else {
          // Fallback to localStorage if auth fails
          const userId = localStorage.getItem('userId') || new URLSearchParams(window.location.search).get('userId');
          if (userId) {
            const res = await fetch(`/api/farmer/land-details?userId=${userId}`);
            const data = await res.json();
            if (res.ok) {
              setLandDetails(data.data && data.data.length > 0 ? data.data[0] : null);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load land details:', err);
      }
    }
    loadLandDetails();
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

          {/* Mapped Land Details Section */}
          <section className="bg-[#fffaf1] border border-[#e2d4b7] rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#1f3b2c]">Mapped Land Details</h2>
              <button
                onClick={() => router.push('/dashboard/farmer/land/details')}
                className="inline-flex items-center rounded-md bg-[#166534] px-3 py-1 text-xs font-medium text-white hover:bg-[#14532d]"
              >
                Map New Land
              </button>
            </div>
            
            {landDetails ? (
              <div className="border border-[#e2d4b7] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-[#1f3b2c">Land Details</h3>
                  <span className={`px-2 py-1 rounded-full text-[11px] ${
                    landDetails.processingStatus === 'completed' ? 'bg-green-100 text-green-800' : 
                    landDetails.processingStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-red-100 text-red-800'
                  }`}>
                    {landDetails.processingStatus === 'completed' ? '✅ Mapped' : 
                     landDetails.processingStatus === 'pending' ? '⏳ Pending' : 
                     '❌ Failed'}
                  </span>
                </div>

                {/* Land Sketch Image */}
                {landDetails.sketchImage && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-[#1f3b2c]">Land Sketch</h4>
                    <img 
                      src={landDetails.sketchImage.path} 
                      alt="Land Sketch" 
                      className="w-full max-w-xs h-auto border border-[#e2d4b7] rounded-lg"
                    />
                  </div>
                )}

                {/* RTC Details */}
                {landDetails.rtcDetails && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="text-[#1f3b2c]">
                      <span className="font-semibold">Survey Number: </span>
                      {landDetails.rtcDetails.surveyNumber || '—'}
                    </div>
                    <div className="text-[#1f3b2c]">
                      <span className="font-semibold">Extent: </span>
                      {landDetails.rtcDetails.extent ? `${landDetails.rtcDetails.extent} acres` : '—'}
                    </div>
                    <div className="text-[#1f3b2c]">
                      <span className="font-semibold">Location: </span>
                      {landDetails.rtcDetails.location || '—'}
                    </div>
                    <div className="text-[#1f3b2c]">
                      <span className="font-semibold">Soil Type: </span>
                      {landDetails.rtcDetails.soilType || '—'}
                    </div>
                  </div>
                )}

                {/* Geographic Coordinates */}
                {landDetails.landData && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-[#1f3b2c]">Geographic Coordinates</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[#1f3b2c]">
                      <div>
                        <span className="font-semibold">Centroid: </span>
                        {landDetails.landData.centroidLatitude?.toFixed(7)}, {landDetails.landData.centroidLongitude?.toFixed(7)}
                      </div>
                      <div>
                        <span className="font-semibold">Land Size: </span>
                        {landDetails.landData.landSizeInAcres ? (
                          <>
                            {landDetails.landData.landSizeInAcres.toFixed(2)} acres
                          </>
                        ) : '—'}
                      </div>
                      <div>
                        <span className="font-semibold">Vertices: </span>
                        {landDetails.landData.vertices?.length || 0} points
                      </div>
                      <div>
                        <span className="font-semibold">Side Lengths: </span>
                        {landDetails.landData.sideLengths?.length || 0} sides
                      </div>
                    </div>

                    {/* Show calculated side lengths */}
                    {landDetails.landData.sideLengths && landDetails.landData.sideLengths.length > 0 && (
                      <div className="mt-2">
                        <span className="font-semibold text-[#1f3b2c]">Calculated Side Lengths:</span>
                        <div className="text-[#1f3b2c] text-xs mt-1">
                          {landDetails.landData.sideLengths.map((length: number, index: number) => (
                            <span key={index} className="inline-block mr-2 mb-1">
                              Side {index + 1}: {length.toFixed(2)}m
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Show vertices coordinates */}
                    {landDetails.landData.vertices && landDetails.landData.vertices.length > 0 && (
                      <div className="mt-2">
                        <span className="font-semibold text-[#1f3b2c]">Vertex Coordinates:</span>
                        <div className="text-[#1f3b2c] text-xs mt-1 max-h-24 overflow-y-auto">
                          {landDetails.landData.vertices
                            .sort((a: any, b: any) => a.order - b.order)
                            .map((vertex: any, index: number) => (
                              <div key={index} className="mr-2 mb-1">
                                {vertex.order}: {vertex.latitude.toFixed(7)}, {vertex.longitude.toFixed(7)}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Download GeoJSON */}
                {landDetails.landData?.geojson && (
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        const blob = new Blob([landDetails.landData.geojson], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `land-parcel.geojson`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="inline-flex items-center rounded-md bg-[#166534] px-3 py-1 text-xs font-medium text-white hover:bg-[#14532d]"
                    >
                      Download GeoJSON
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-[#6b7280] mb-4">
                  No mapped land details found. Use the land mapping tool to convert your land sketches to geographic coordinates.
                </p>
                <button
                  onClick={() => router.push('/dashboard/farmer/land/details')}
                  className="inline-flex items-center rounded-md bg-[#166534] px-4 py-2 text-xs font-medium text-white hover:bg-[#14532d]"
                >
                  Start Land Mapping
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
