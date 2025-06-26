/**
 * Usage:
 * <GenerateAndDownloadSTR reportData={...} />
 *
 * reportData should include all fields required by the backend STR report (caseSummary, walletAddress, etc.)
 */
import React, { useState } from 'react';

const GenerateAndDownloadSTR = ({ reportData }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportId, setReportId] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setReportId(null);
    try {
      const res = await fetch('/api/str-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
      });
      if (!res.ok) throw new Error('Failed to generate STR report');
      const data = await res.json();
      setReportId(data.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: 16, borderRadius: 8, maxWidth: 400 }}>
      <h3>STR Report Generation</h3>
      <button onClick={handleGenerate} disabled={loading} style={{ marginBottom: 8 }}>
        {loading ? 'Generating...' : 'Generate STR Report'}
      </button>
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
      {reportId && (
        <a
          href={`/api/str-reports/${reportId}/download`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-block', marginTop: 8 }}
        >
          <button>Download STR PDF</button>
        </a>
      )}
    </div>
  );
};

export default GenerateAndDownloadSTR; 