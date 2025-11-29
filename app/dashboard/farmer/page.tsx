export default function FarmerOverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1f3b2c]">Welcome, Farmer!</h1>
        <p className="text-sm text-[#6b7280] mt-1">
          This is your AgriLink dashboard. Manage your farm and assets here.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#fffaf1] border border-[#e2d4b7] rounded-lg p-6">
          <h2 className="text-base font-semibold text-[#1f3b2c] mb-2">Complete Your Profile</h2>
          <p className="text-xs text-[#6b7280] mb-4">
            Upload your KYC documents to unlock all features, including land integration.
          </p>
          <a
            href="/dashboard/farmer/documents"
            className="inline-flex items-center justify-center rounded-md bg-[#166534] px-4 py-2 text-xs font-medium text-white hover:bg-[#14532d]"
          >
            Upload Documents
          </a>
        </div>
        <div className="bg-[#fffaf1] border border-[#e2d4b7] rounded-lg p-6">
          <h2 className="text-base font-semibold text-[#1f3b2c] mb-2">Land Integration</h2>
          <p className="text-xs text-[#6b7280] mb-4">
            View and manage your land integration agreements with other farmers.
          </p>
          <button className="inline-flex items-center justify-center rounded-md bg-[#166534] px-4 py-2 text-xs font-medium text-white hover:bg-[#14532d]">
            Manage Agreements
          </button>
        </div>
        <div className="bg-[#fffaf1] border border-[#e2d4b7] rounded-lg p-6">
          <h2 className="text-base font-semibold text-[#1f3b2c] mb-2">Market Intelligence</h2>
          <p className="text-xs text-[#6b7280] mb-4">
            Get AI-powered crop price predictions to maximize your profit.
          </p>
          <button className="inline-flex items-center justify-center rounded-md bg-[#166534] px-4 py-2 text-xs font-medium text-white hover:bg-[#14532d]">
            View Predictions
          </button>
        </div>
      </div>
    </div>
  );
}
