const { PrismaClient } = require('@prisma/client');

class LoopDetectionService {
  constructor() {
    this.prisma = new PrismaClient();
    this.maxLoopLength = 10; // Maximum number of hops in a loop
    this.timeWindow = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  }

  /**
   * Detect looping patterns in bridge transactions
   */
  async detectLoopingPatterns() {
    try {
      console.log('🔄 Detecting looping patterns...');
      
      const timeAgo = new Date(Date.now() - this.timeWindow);
      
      // Get recent transactions
      const transactions = await this.prisma.bridgeTransaction.findMany({
        where: {
          timestamp: {
            gte: timeAgo
          }
        },
        orderBy: {
          timestamp: 'asc'
        }
      });

      if (transactions.length === 0) {
        console.log('ℹ️ No recent transactions to analyze for loops');
        return [];
      }

      const loops = [];
      
      // Group transactions by wallet addresses
      const walletTransactions = this.groupTransactionsByWallet(transactions);
      
      // Detect loops for each wallet
      for (const [walletAddress, walletTxs] of Object.entries(walletTransactions)) {
        const walletLoops = this.detectWalletLoops(walletAddress, walletTxs);
        loops.push(...walletLoops);
      }

      // Save detected loops to database
      await this.saveDetectedLoops(loops);
      
      console.log(`✅ Detected ${loops.length} looping patterns`);
      return loops;
      
    } catch (error) {
      console.error('❌ Error detecting looping patterns:', error.message);
      return [];
    }
  }

  /**
   * Group transactions by wallet addresses
   */
  groupTransactionsByWallet(transactions) {
    const walletTransactions = {};
    
    for (const tx of transactions) {
      // Add source address transactions
      if (!walletTransactions[tx.sourceAddress]) {
        walletTransactions[tx.sourceAddress] = [];
      }
      walletTransactions[tx.sourceAddress].push({
        ...tx,
        role: 'source',
        relatedAddress: tx.destinationAddress
      });
      
      // Add destination address transactions
      if (!walletTransactions[tx.destinationAddress]) {
        walletTransactions[tx.destinationAddress] = [];
      }
      walletTransactions[tx.destinationAddress].push({
        ...tx,
        role: 'destination',
        relatedAddress: tx.sourceAddress
      });
    }
    
    return walletTransactions;
  }

  /**
   * Detect loops for a specific wallet
   */
  detectWalletLoops(walletAddress, transactions) {
    const loops = [];
    
    // Sort transactions by timestamp
    transactions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Find all possible paths starting from this wallet
    const paths = this.findPaths(walletAddress, transactions, new Set(), []);
    
    // Check each path for loops
    for (const path of paths) {
      if (this.isLoop(path)) {
        const loop = this.createLoopObject(walletAddress, path);
        loops.push(loop);
      }
    }
    
    return loops;
  }

  /**
   * Find all paths from a starting wallet
   */
  findPaths(currentWallet, transactions, visited, currentPath, maxDepth = 5) {
    if (currentPath.length >= maxDepth) {
      return [currentPath];
    }
    
    const paths = [];
    const walletTxs = transactions.filter(tx => 
      (tx.sourceAddress === currentWallet || tx.destinationAddress === currentWallet) &&
      !visited.has(tx.id)
    );
    
    for (const tx of walletTxs) {
      const nextWallet = tx.sourceAddress === currentWallet ? tx.destinationAddress : tx.sourceAddress;
      
      if (currentPath.length === 0 || nextWallet !== currentPath[currentPath.length - 1].wallet) {
        const newPath = [...currentPath, {
          wallet: nextWallet,
          transaction: tx,
          timestamp: tx.timestamp
        }];
        
        const newVisited = new Set(visited);
        newVisited.add(tx.id);
        
        const subPaths = this.findPaths(nextWallet, transactions, newVisited, newPath, maxDepth);
        paths.push(...subPaths);
      }
    }
    
    if (paths.length === 0) {
      return [currentPath];
    }
    
    return paths;
  }

  /**
   * Check if a path forms a loop
   */
  isLoop(path) {
    if (path.length < 3) return false;
    
    const wallets = path.map(step => step.wallet);
    const firstWallet = wallets[0];
    const lastWallet = wallets[wallets.length - 1];
    
    // Check if path ends where it started
    if (firstWallet !== lastWallet) return false;
    
    // Check for intermediate loops (A→B→A)
    const walletCounts = {};
    for (const wallet of wallets) {
      walletCounts[wallet] = (walletCounts[wallet] || 0) + 1;
    }
    
    // A valid loop should have the starting wallet appear exactly twice (start and end)
    // and other wallets should appear at most once
    if (walletCounts[firstWallet] !== 2) return false;
    
    for (const [wallet, count] of Object.entries(walletCounts)) {
      if (wallet !== firstWallet && count > 1) return false;
    }
    
    return true;
  }

  /**
   * Create loop object for database storage
   */
  createLoopObject(startingWallet, path) {
    const wallets = path.map(step => step.wallet);
    const transactions = path.map(step => step.transaction);
    
    return {
      id: `loop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startingWallet,
      loopPath: wallets,
      transactionIds: transactions.map(tx => tx.id),
      transactionHashes: transactions.map(tx => tx.transactionHash),
      loopLength: path.length,
      totalAmount: transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0),
      startTime: path[0].timestamp,
      endTime: path[path.length - 1].timestamp,
      duration: path[path.length - 1].timestamp.getTime() - path[0].timestamp.getTime(),
      riskScore: this.calculateLoopRiskScore(path),
      riskFlags: this.generateLoopRiskFlags(path),
      detectedAt: new Date()
    };
  }

  /**
   * Calculate risk score for a loop
   */
  calculateLoopRiskScore(path) {
    let riskScore = 0;
    
    // Base risk for any loop
    riskScore += 0.3;
    
    // Risk based on loop length
    if (path.length === 3) riskScore += 0.2; // A→B→A
    else if (path.length === 4) riskScore += 0.3; // A→B→C→A
    else if (path.length >= 5) riskScore += 0.4; // Longer loops
    
    // Risk based on time duration
    const duration = path[path.length - 1].timestamp.getTime() - path[0].timestamp.getTime();
    const durationHours = duration / (60 * 60 * 1000);
    
    if (durationHours < 1) riskScore += 0.3; // Very fast loop
    else if (durationHours < 24) riskScore += 0.2; // Same day loop
    else if (durationHours < 168) riskScore += 0.1; // Same week loop
    
    // Risk based on total amount
    const totalAmount = path.reduce((sum, step) => sum + parseFloat(step.transaction.amount), 0);
    if (totalAmount > 1000000) riskScore += 0.2; // High value loop
    else if (totalAmount > 100000) riskScore += 0.1; // Medium value loop
    
    return Math.min(riskScore, 1.0);
  }

  /**
   * Generate risk flags for a loop
   */
  generateLoopRiskFlags(path) {
    const flags = [];
    
    // Loop type flags
    if (path.length === 3) flags.push('SIMPLE_LOOP');
    else if (path.length === 4) flags.push('COMPLEX_LOOP');
    else flags.push('EXTENDED_LOOP');
    
    // Timing flags
    const duration = path[path.length - 1].timestamp.getTime() - path[0].timestamp.getTime();
    const durationHours = duration / (60 * 60 * 1000);
    
    if (durationHours < 1) flags.push('RAPID_LOOP');
    else if (durationHours < 24) flags.push('SAME_DAY_LOOP');
    
    // Amount flags
    const totalAmount = path.reduce((sum, step) => sum + parseFloat(step.transaction.amount), 0);
    if (totalAmount > 1000000) flags.push('HIGH_VALUE_LOOP');
    else if (totalAmount > 100000) flags.push('MEDIUM_VALUE_LOOP');
    
    // Bridge diversity flags
    const bridges = [...new Set(path.map(step => step.transaction.bridgeProtocol))];
    if (bridges.length > 1) flags.push('MULTI_BRIDGE_LOOP');
    
    return flags;
  }

  /**
   * Save detected loops to database
   */
  async saveDetectedLoops(loops) {
    try {
      for (const loop of loops) {
        await this.prisma.auditLog.create({
          data: {
            action: 'LOOP_PATTERN_DETECTED',
            entityType: 'LOOP',
            entityId: loop.id,
            userId: 'system',
            details: {
              loopData: loop,
              timestamp: new Date()
            }
          }
        });
      }
      
      console.log(`💾 Saved ${loops.length} loop patterns to database`);
    } catch (error) {
      console.error('❌ Failed to save loop patterns:', error.message);
    }
  }

  /**
   * Get recent loop patterns
   */
  async getRecentLoops(hours = 24) {
    try {
      const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const loops = await this.prisma.auditLog.findMany({
        where: {
          action: 'LOOP_PATTERN_DETECTED',
          createdAt: {
            gte: timeAgo
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      return loops.map(log => log.details.loopData);
    } catch (error) {
      console.error('❌ Failed to get recent loops:', error.message);
      return [];
    }
  }

  /**
   * Get loop statistics
   */
  async getLoopStats() {
    try {
      const loops = await this.getRecentLoops(24);
      
      const stats = {
        totalLoops: loops.length,
        simpleLoops: loops.filter(loop => loop.loopLength === 3).length,
        complexLoops: loops.filter(loop => loop.loopLength === 4).length,
        extendedLoops: loops.filter(loop => loop.loopLength >= 5).length,
        highRiskLoops: loops.filter(loop => loop.riskScore >= 0.7).length,
        averageRiskScore: loops.length > 0 ? 
          loops.reduce((sum, loop) => sum + loop.riskScore, 0) / loops.length : 0,
        totalVolume: loops.reduce((sum, loop) => sum + loop.totalAmount, 0)
      };
      
      return stats;
    } catch (error) {
      console.error('❌ Failed to get loop stats:', error.message);
      return null;
    }
  }

  /**
   * Start continuous loop detection
   */
  async startContinuousDetection(intervalMinutes = 30) {
    console.log(`🔄 Starting continuous loop detection (every ${intervalMinutes} minutes)...`);
    
    // Run initial detection
    await this.detectLoopingPatterns();
    
    // Schedule periodic detection
    setInterval(async () => {
      await this.detectLoopingPatterns();
    }, intervalMinutes * 60 * 1000);
    
    console.log('✅ Continuous loop detection started');
  }
}

module.exports = LoopDetectionService; 