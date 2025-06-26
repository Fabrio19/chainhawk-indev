import React, { useState, useEffect } from 'react';
import { 
  linkKYCIdentity, 
  getWalletKYCIdentities, 
  removeKYCLink 
} from '@/services/apiService';

const KYCIdentityLinkage = ({ walletAddress, onLinkSuccess }) => {
  const [linkedIdentities, setLinkedIdentities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    pan: '',
    aadhaar: '',
    name: '',
    dob: '',
    address: '',
    manual: true,
  });

  // Fetch linked identities on component mount
  useEffect(() => {
    if (walletAddress) {
      fetchLinkedIdentities();
    }
  }, [walletAddress]);

  const fetchLinkedIdentities = async () => {
    try {
      setLoading(true);
      const data = await getWalletKYCIdentities(walletAddress);
      setLinkedIdentities(data.linkedIdentities);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.pan && !formData.aadhaar) {
      setError('Either PAN or Aadhaar is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await linkKYCIdentity({
        ...formData,
        wallet: walletAddress,
        linked_by: 'current-user-id', // Replace with actual user ID
      });
      
      setShowForm(false);
      setFormData({ pan: '', aadhaar: '', name: '', dob: '', address: '', manual: true });
      fetchLinkedIdentities(); // Refresh the list
      if (onLinkSuccess) onLinkSuccess(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const removeLink = async (linkId) => {
    try {
      await removeKYCLink(linkId);
      fetchLinkedIdentities(); // Refresh the list
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ border: '1px solid #ddd', padding: 16, borderRadius: 8, margin: 16 }}>
      <h3>KYC Identity Linkage</h3>
      <p><strong>Wallet:</strong> {walletAddress}</p>
      
      {/* Link New Identity Button */}
      <button 
        onClick={() => setShowForm(!showForm)}
        style={{ marginBottom: 16 }}
      >
        {showForm ? 'Cancel' : 'Link New KYC Identity'}
      </button>

      {/* Link Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: 16, padding: 16, border: '1px solid #eee' }}>
          <h4>Link KYC Identity</h4>
          
          <div style={{ marginBottom: 8 }}>
            <label>
              <input
                type="checkbox"
                name="manual"
                checked={formData.manual}
                onChange={handleInputChange}
              />
              Manual Entry (uncheck for API integration)
            </label>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label>PAN: <input
              type="text"
              name="pan"
              value={formData.pan}
              onChange={handleInputChange}
              placeholder="Enter PAN number"
            /></label>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label>Aadhaar: <input
              type="text"
              name="aadhaar"
              value={formData.aadhaar}
              onChange={handleInputChange}
              placeholder="Enter Aadhaar number"
            /></label>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label>Name: <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Full name"
            /></label>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label>Date of Birth: <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleInputChange}
            /></label>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label>Address: <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Full address"
              rows={3}
            /></label>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Linking...' : 'Link Identity'}
          </button>
        </form>
      )}

      {/* Error Display */}
      {error && (
        <div style={{ color: 'red', marginBottom: 16 }}>
          Error: {error}
        </div>
      )}

      {/* Linked Identities List */}
      <div>
        <h4>Linked KYC Identities ({linkedIdentities.length})</h4>
        {loading ? (
          <p>Loading...</p>
        ) : linkedIdentities.length === 0 ? (
          <p>No KYC identities linked to this wallet.</p>
        ) : (
          <div>
            {linkedIdentities.map((identity, index) => (
              <div key={index} style={{ border: '1px solid #ccc', padding: 12, marginBottom: 8, borderRadius: 4 }}>
                <div><strong>Name:</strong> {identity.name || 'N/A'}</div>
                <div><strong>PAN:</strong> {identity.pan || 'N/A'}</div>
                <div><strong>Aadhaar:</strong> {identity.aadhaar || 'N/A'}</div>
                <div><strong>Address:</strong> {identity.address || 'N/A'}</div>
                <div><strong>Linked:</strong> {new Date(identity.linkedAt).toLocaleDateString()}</div>
                <button 
                  onClick={() => removeLink(identity.id)}
                  style={{ marginTop: 8, backgroundColor: '#ff4444', color: 'white' }}
                >
                  Remove Link
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export { KYCIdentityLinkage }; 