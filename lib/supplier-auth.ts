// Helper utility for supplier authentication
export function getSellerId(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  
  const sellerInfo = localStorage.getItem('sellerInfo');
  if (sellerInfo) {
    try {
      const seller = JSON.parse(sellerInfo);
      return seller.id || seller._id || '';
    } catch (err) {
      console.error('Error parsing seller info:', err);
    }
  }
  // Fallback for development so API routes that handle 'temp-seller-id' work
  return 'temp-seller-id';
}

export function getAuthHeaders(): Record<string, string> {
  const id = getSellerId();
  const headers: Record<string, string> = {};
  if (id) {
    headers['x-seller-id'] = id;
  }
  return headers;
}
