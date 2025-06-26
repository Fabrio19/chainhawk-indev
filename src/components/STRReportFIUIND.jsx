import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 12, fontFamily: 'Helvetica' },
  section: { marginBottom: 16 },
  heading: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  label: { fontWeight: 'bold' },
  table: { display: 'table', width: 'auto', marginBottom: 8 },
  row: { flexDirection: 'row' },
  cell: { flex: 1, padding: 2, borderBottom: '1px solid #ccc' },
  disclaimer: { fontSize: 10, marginTop: 24, textAlign: 'center', color: '#888' },
  signature: { marginTop: 32, minHeight: 40, borderBottom: '1px solid #000', width: 200 },
});

const STRReportFIUIND = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* 1. Case Summary */}
      <View style={styles.section}>
        <Text style={styles.heading}>1. Case Summary</Text>
        <Text>{data.caseSummary}</Text>
      </View>

      {/* 2. Wallet details + risk score */}
      <View style={styles.section}>
        <Text style={styles.heading}>2. Wallet Details & Risk Score</Text>
        <Text><Text style={styles.label}>Wallet Address:</Text> {data.walletAddress}</Text>
        <Text><Text style={styles.label}>Risk Score:</Text> {data.riskScore}/100</Text>
      </View>

      {/* 3. Transaction details */}
      <View style={styles.section}>
        <Text style={styles.heading}>3. Transaction Details</Text>
        <Text><Text style={styles.label}>Last Transaction Hash:</Text> {data.lastTxHash}</Text>
        <Text><Text style={styles.label}>Flow Summary:</Text> {data.flowSummary}</Text>
      </View>

      {/* 4. Linked KYC identity info */}
      <View style={styles.section}>
        <Text style={styles.heading}>4. Linked KYC Identity Info</Text>
        <Text><Text style={styles.label}>Name:</Text> {data.kycName}</Text>
        <Text><Text style={styles.label}>ID Number:</Text> {data.kycIdNumber}</Text>
        <Text><Text style={styles.label}>Address:</Text> {data.kycAddress}</Text>
      </View>

      {/* 5. List of evidence files */}
      <View style={styles.section}>
        <Text style={styles.heading}>5. Evidence Files</Text>
        {data.evidenceFiles && data.evidenceFiles.length > 0 ? (
          <View style={styles.table}>
            {data.evidenceFiles.map((file, idx) => (
              <View style={styles.row} key={idx}>
                <Text style={styles.cell}>{file.file_type}</Text>
                <Text style={styles.cell}>{file.file_path}</Text>
                <Text style={styles.cell}>{file.description}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text>No evidence files attached.</Text>
        )}
      </View>

      {/* 6. Action history */}
      <View style={styles.section}>
        <Text style={styles.heading}>6. Action History</Text>
        {data.actionHistory && data.actionHistory.length > 0 ? (
          <View style={styles.table}>
            {data.actionHistory.map((action, idx) => (
              <View style={styles.row} key={idx}>
                <Text style={styles.cell}>{action.performed_by}</Text>
                <Text style={styles.cell}>{action.action}</Text>
                <Text style={styles.cell}>{action.performed_at}</Text>
                <Text style={styles.cell}>{action.details}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text>No actions recorded.</Text>
        )}
      </View>

      {/* 7. Investigator name + signature */}
      <View style={styles.section}>
        <Text style={styles.heading}>7. Investigator</Text>
        <Text><Text style={styles.label}>Name:</Text> {data.investigatorName}</Text>
        <Text style={styles.signature}>Signature: ___________________________</Text>
      </View>

      {/* 8. Date & time of report generation */}
      <View style={styles.section}>
        <Text style={styles.heading}>8. Report Generated</Text>
        <Text>{data.generatedAt}</Text>
      </View>

      {/* 9. Disclaimer */}
      <Text style={styles.disclaimer}>
        For internal FIU-IND reporting only. This document is confidential and intended for compliance and regulatory use.
      </Text>
    </Page>
  </Document>
);

export default STRReportFIUIND; 