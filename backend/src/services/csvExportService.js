const fs = require('fs').promises;
const path = require('path');
const { PrismaClient } = require('@prisma/client');

class CSVExportService {
  constructor() {
    this.prisma = new PrismaClient();
    this.exportDir = process.env.CSV_EXPORT_DIR || './exports';
    this.isRunning = false;
    this.exportInterval = null;
  }

  /**
   * Start hourly CSV export
   */
  async startHourlyExport() {
    if (this.isRunning) {
      console.log('⚠️ CSV export service is already running');
      return;
    }

    console.log('📊 Starting hourly CSV export service...');
    
    // Create export directory if it doesn't exist
    await this.ensureExportDirectory();
    
    // Run initial export
    await this.exportTransactions();
    
    // Schedule hourly exports
    this.exportInterval = setInterval(async () => {
      await this.exportTransactions();
    }, 60 * 60 * 1000); // Every hour
    
    this.isRunning = true;
    console.log('✅ Hourly CSV export service started');
  }

  /**
   * Stop hourly CSV export
   */
  stopHourlyExport() {
    if (this.exportInterval) {
      clearInterval(this.exportInterval);
      this.exportInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 Hourly CSV export service stopped');
  }

  /**
   * Export transactions to CSV
   */
  async exportTransactions() {
    try {
      console.log('📊 Exporting transactions to CSV...');
      
      const timestamp = new Date();
      const filename = `bridge-transactions-${timestamp.toISOString().split('T')[0]}-${timestamp.getHours()}.csv`;
      const filepath = path.join(this.exportDir, filename);
      
      // Get transactions from the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const transactions = await this.prisma.bridgeTransaction.findMany({
        where: {
          timestamp: {
            gte: oneHourAgo
          }
        },
        orderBy: {
          timestamp: 'desc'
        }
      });

      if (transactions.length === 0) {
        console.log('ℹ️ No transactions to export in the last hour');
        return;
      }

      // Generate CSV content
      const csvContent = this.generateCSV(transactions);
      
      // Write to file
      await fs.writeFile(filepath, csvContent, 'utf8');
      
      console.log(`✅ Exported ${transactions.length} transactions to ${filename}`);
      
      // Log export in database
      await this.logExport(filename, transactions.length);
      
    } catch (error) {
      console.error('❌ Failed to export transactions:', error.message);
    }
  }

  /**
   * Generate CSV content from transactions
   */
  generateCSV(transactions) {
    const headers = [
      'Transaction Hash',
      'Bridge Protocol',
      'Source Chain',
      'Destination Chain',
      'Source Address',
      'Destination Address',
      'Token Address',
      'Token Symbol',
      'Amount',
      'Risk Score',
      'Risk Flags',
      'Status',
      'Block Number',
      'Timestamp',
      'Created At'
    ];

    const rows = transactions.map(tx => [
      tx.transactionHash,
      tx.bridgeProtocol,
      tx.sourceChain,
      tx.destinationChain,
      tx.sourceAddress,
      tx.destinationAddress,
      tx.tokenAddress,
      tx.tokenSymbol,
      tx.amount,
      tx.riskScore || 0,
      Array.isArray(tx.riskFlags) ? tx.riskFlags.join(';') : '',
      tx.status,
      tx.blockNumber,
      tx.timestamp.toISOString(),
      tx.createdAt.toISOString()
    ]);

    // Escape CSV values
    const escapedRows = rows.map(row => 
      row.map(cell => {
        if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      })
    );

    return [headers, ...escapedRows]
      .map(row => row.join(','))
      .join('\n');
  }

  /**
   * Export specific date range
   */
  async exportDateRange(startDate, endDate, filename = null) {
    try {
      console.log(`📊 Exporting transactions from ${startDate} to ${endDate}...`);
      
      if (!filename) {
        const timestamp = new Date().toISOString().split('T')[0];
        filename = `bridge-transactions-${startDate}-to-${endDate}-${timestamp}.csv`;
      }
      
      const filepath = path.join(this.exportDir, filename);
      
      const transactions = await this.prisma.bridgeTransaction.findMany({
        where: {
          timestamp: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        orderBy: {
          timestamp: 'desc'
        }
      });

      if (transactions.length === 0) {
        console.log('ℹ️ No transactions found in the specified date range');
        return null;
      }

      const csvContent = this.generateCSV(transactions);
      await fs.writeFile(filepath, csvContent, 'utf8');
      
      console.log(`✅ Exported ${transactions.length} transactions to ${filename}`);
      await this.logExport(filename, transactions.length);
      
      return filepath;
      
    } catch (error) {
      console.error('❌ Failed to export date range:', error.message);
      return null;
    }
  }

  /**
   * Export high-risk transactions
   */
  async exportHighRiskTransactions(riskThreshold = 0.7, hours = 24) {
    try {
      console.log(`📊 Exporting high-risk transactions (threshold: ${riskThreshold})...`);
      
      const timestamp = new Date();
      const filename = `high-risk-transactions-${timestamp.toISOString().split('T')[0]}-${timestamp.getHours()}.csv`;
      const filepath = path.join(this.exportDir, filename);
      
      const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const transactions = await this.prisma.bridgeTransaction.findMany({
        where: {
          riskScore: {
            gte: riskThreshold
          },
          timestamp: {
            gte: timeAgo
          }
        },
        orderBy: {
          riskScore: 'desc'
        }
      });

      if (transactions.length === 0) {
        console.log('ℹ️ No high-risk transactions found');
        return null;
      }

      const csvContent = this.generateCSV(transactions);
      await fs.writeFile(filepath, csvContent, 'utf8');
      
      console.log(`✅ Exported ${transactions.length} high-risk transactions to ${filename}`);
      await this.logExport(filename, transactions.length, 'HIGH_RISK');
      
      return filepath;
      
    } catch (error) {
      console.error('❌ Failed to export high-risk transactions:', error.message);
      return null;
    }
  }

  /**
   * Ensure export directory exists
   */
  async ensureExportDirectory() {
    try {
      await fs.access(this.exportDir);
    } catch (error) {
      await fs.mkdir(this.exportDir, { recursive: true });
      console.log(`📁 Created export directory: ${this.exportDir}`);
    }
  }

  /**
   * Log export in database
   */
  async logExport(filename, transactionCount, exportType = 'HOURLY') {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'CSV_EXPORT_COMPLETED',
          entityType: 'EXPORT',
          entityId: filename,
          userId: 'system',
          details: {
            filename,
            transactionCount,
            exportType,
            exportPath: path.join(this.exportDir, filename),
            timestamp: new Date()
          }
        }
      });
    } catch (error) {
      console.error('❌ Failed to log export:', error.message);
    }
  }

  /**
   * Get export statistics
   */
  async getExportStats() {
    try {
      const files = await fs.readdir(this.exportDir);
      const csvFiles = files.filter(file => file.endsWith('.csv'));
      
      const stats = {
        totalFiles: csvFiles.length,
        totalSize: 0,
        lastExport: null,
        files: []
      };

      for (const file of csvFiles) {
        const filepath = path.join(this.exportDir, file);
        const fileStats = await fs.stat(filepath);
        
        stats.totalSize += fileStats.size;
        stats.files.push({
          name: file,
          size: fileStats.size,
          modified: fileStats.mtime
        });
      }

      if (stats.files.length > 0) {
        stats.lastExport = stats.files.sort((a, b) => b.modified - a.modified)[0].modified;
      }

      return stats;
    } catch (error) {
      console.error('❌ Failed to get export stats:', error.message);
      return null;
    }
  }

  /**
   * Clean old export files
   */
  async cleanOldExports(daysToKeep = 30) {
    try {
      const files = await fs.readdir(this.exportDir);
      const csvFiles = files.filter(file => file.endsWith('.csv'));
      
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      let deletedCount = 0;

      for (const file of csvFiles) {
        const filepath = path.join(this.exportDir, file);
        const fileStats = await fs.stat(filepath);
        
        if (fileStats.mtime < cutoffDate) {
          await fs.unlink(filepath);
          deletedCount++;
        }
      }

      console.log(`🗑️ Cleaned ${deletedCount} old export files`);
      return deletedCount;
    } catch (error) {
      console.error('❌ Failed to clean old exports:', error.message);
      return 0;
    }
  }
}

module.exports = CSVExportService; 