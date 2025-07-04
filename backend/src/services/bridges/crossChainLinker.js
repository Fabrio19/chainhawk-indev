const { PrismaClient } = require("@prisma/client");

class CrossChainLinker {
  constructor() {
    this.prisma = new PrismaClient();
    this.pendingLinks = new Map();
  }

  /**
   * Process a new bridge transaction for cross-chain linking
   */
  async processTransaction(transaction) {
    try {
      console.log(`🔗 Processing transaction for cross-chain linking: ${transaction.transactionHash}`);
      
      // Add to pending links
      const key = this.getLinkKey(transaction);
      if (!this.pendingLinks.has(key)) {
        this.pendingLinks.set(key, []);
      }
      this.pendingLinks.get(key).push(transaction);
      
      // Try to find matching transactions
      await this.findMatchingTransactions(transaction);
      
    } catch (error) {
      console.error('❌ Error processing transaction for linking:', error.message);
    }
  }

  /**
   * Find matching transactions across chains
   */
  async findMatchingTransactions(transaction) {
    try {
      const { bridgeProtocol, amount, tokenAddress, timestamp } = transaction;
      
      // Look for transactions with similar characteristics
      const potentialMatches = await this.prisma.bridgeTransaction.findMany({
        where: {
          AND: [
            { bridgeProtocol },
            { tokenAddress },
            { 
              amount: {
                gte: (parseFloat(amount) * 0.99).toString(), // Allow 1% variance
                lte: (parseFloat(amount) * 1.01).toString()
              }
            },
            {
              timestamp: {
                gte: new Date(timestamp.getTime() - 5 * 60 * 1000), // Within 5 minutes
                lte: new Date(timestamp.getTime() + 5 * 60 * 1000)
              }
            },
            { id: { not: transaction.id } },
            { processed: false }
          ]
        },
        orderBy: { timestamp: 'asc' }
      });

      for (const match of potentialMatches) {
        await this.evaluateLink(transaction, match);
      }
      
    } catch (error) {
      console.error('❌ Error finding matching transactions:', error.message);
    }
  }

  /**
   * Evaluate if two transactions form a cross-chain link
   */
  async evaluateLink(tx1, tx2) {
    try {
      const linkScore = this.calculateLinkScore(tx1, tx2);
      
      if (linkScore.confidence >= 0.7) {
        await this.createCrossChainLink(tx1, tx2, linkScore);
      }
      
    } catch (error) {
      console.error('❌ Error evaluating link:', error.message);
    }
  }

  /**
   * Calculate link confidence score
   */
  calculateLinkScore(tx1, tx2) {
    let score = 0;
    let confidence = 0;
    const flags = [];

    // Bridge protocol match
    if (tx1.bridgeProtocol === tx2.bridgeProtocol) {
      score += 30;
      flags.push('SAME_BRIDGE');
    }

    // Amount match (with tolerance)
    const amount1 = parseFloat(tx1.amount);
    const amount2 = parseFloat(tx2.amount);
    const amountDiff = Math.abs(amount1 - amount2) / Math.max(amount1, amount2);
    
    if (amountDiff < 0.01) { // 1% tolerance
      score += 40;
      flags.push('AMOUNT_MATCH');
    } else if (amountDiff < 0.05) { // 5% tolerance
      score += 20;
      flags.push('AMOUNT_SIMILAR');
    }

    // Token match
    if (tx1.tokenAddress === tx2.tokenAddress) {
      score += 20;
      flags.push('TOKEN_MATCH');
    }

    // Timing proximity
    const timeDiff = Math.abs(tx1.timestamp.getTime() - tx2.timestamp.getTime());
    if (timeDiff < 60 * 1000) { // Within 1 minute
      score += 20;
      flags.push('TIME_PROXIMITY');
    } else if (timeDiff < 5 * 60 * 1000) { // Within 5 minutes
      score += 10;
      flags.push('TIME_SIMILAR');
    }

    // Chain direction logic
    if (this.isValidChainDirection(tx1, tx2)) {
      score += 15;
      flags.push('VALID_DIRECTION');
    }

    // Event type correlation
    if (this.areEventsCorrelated(tx1.eventType, tx2.eventType)) {
      score += 15;
      flags.push('EVENT_CORRELATION');
    }

    // Calculate confidence
    confidence = Math.min(score / 100, 1.0);

    return {
      score,
      confidence,
      flags
    };
  }

  /**
   * Check if chain direction is valid for a bridge
   */
  isValidChainDirection(tx1, tx2) {
    // For most bridges, we expect source -> destination flow
    if (tx1.sourceChain === tx2.destinationChain && 
        tx1.destinationChain === tx2.sourceChain) {
      return true;
    }

    // Some bridges might have same-chain events (like pool operations)
    if (tx1.sourceChain === tx2.sourceChain) {
      return true;
    }

    return false;
  }

  /**
   * Check if event types are correlated
   */
  areEventsCorrelated(event1, event2) {
    const correlations = {
      'SendMsg': ['ReceiveMsg', 'Swap'],
      'ReceiveMsg': ['SendMsg', 'Swap'],
      'Swap': ['SendMsg', 'ReceiveMsg'],
      'LogMessagePublished': ['TransferTokens', 'Redeem'],
      'TransferTokens': ['LogMessagePublished', 'Redeem'],
      'Redeem': ['LogMessagePublished', 'TransferTokens'],
      'TokenSwap': ['TokenRedeem'],
      'TokenRedeem': ['TokenSwap'],
      'Send': ['Relay', 'Receive'],
      'Relay': ['Send', 'Receive'],
      'Receive': ['Send', 'Relay']
    };

    return correlations[event1]?.includes(event2) || 
           correlations[event2]?.includes(event1);
  }

  /**
   * Create cross-chain link in database
   */
  async createCrossChainLink(tx1, tx2, linkScore) {
    try {
      // Determine source and destination based on event types and timing
      const { sourceTx, destTx } = this.determineSourceDestination(tx1, tx2);
      
      const link = await this.prisma.detectedCrossChainLink.create({
        data: {
          sourceWalletAddress: sourceTx.sourceAddress,
          destinationWalletAddress: destTx.destinationAddress || destTx.sourceAddress,
          sourceChain: sourceTx.sourceChain,
          destinationChain: destTx.sourceChain,
          linkType: this.determineLinkType(sourceTx, destTx),
          confidence: this.mapConfidenceToEnum(linkScore.confidence),
          tokenAddress: sourceTx.tokenAddress,
          tokenSymbol: sourceTx.tokenSymbol,
          totalAmount: sourceTx.amount,
          transactionCount: 2,
          firstSeenAt: sourceTx.timestamp,
          lastSeenAt: destTx.timestamp,
          riskScore: (sourceTx.riskScore + destTx.riskScore) / 2,
          riskFlags: linkScore.flags,
          metadata: {
            linkScore: linkScore.score,
            linkConfidence: linkScore.confidence,
            bridgeProtocol: sourceTx.bridgeProtocol,
            sourceEvent: sourceTx.eventType,
            destEvent: destTx.eventType
          },
          bridgeTransactionIds: [sourceTx.id, destTx.id],
          walletFlowIds: []
        }
      });

      // Mark transactions as processed
      await this.prisma.bridgeTransaction.updateMany({
        where: {
          id: { in: [sourceTx.id, destTx.id] }
        },
        data: {
          processed: true,
          linkedTransactionId: link.id
        }
      });

      console.log(`🔗 Created cross-chain link: ${sourceTx.sourceChain} -> ${destTx.sourceChain}`);
      console.log(`   Confidence: ${linkScore.confidence.toFixed(2)}`);
      console.log(`   Flags: ${linkScore.flags.join(', ')}`);

      return link;
      
    } catch (error) {
      console.error('❌ Error creating cross-chain link:', error.message);
    }
  }

  /**
   * Determine source and destination transactions
   */
  determineSourceDestination(tx1, tx2) {
    // Use event types to determine flow direction
    const sendEvents = ['SendMsg', 'LogMessagePublished', 'TokenSwap', 'Send'];
    const receiveEvents = ['ReceiveMsg', 'TransferTokens', 'TokenRedeem', 'Receive', 'Redeem'];
    
    const tx1IsSend = sendEvents.includes(tx1.eventType);
    const tx2IsSend = sendEvents.includes(tx2.eventType);
    const tx1IsReceive = receiveEvents.includes(tx1.eventType);
    const tx2IsReceive = receiveEvents.includes(tx2.eventType);
    
    if (tx1IsSend && tx2IsReceive) {
      return { sourceTx: tx1, destTx: tx2 };
    } else if (tx2IsSend && tx1IsReceive) {
      return { sourceTx: tx2, destTx: tx1 };
    } else {
      // If unclear, use timestamp
      return tx1.timestamp < tx2.timestamp ? 
        { sourceTx: tx1, destTx: tx2 } : 
        { sourceTx: tx2, destTx: tx1 };
    }
  }

  /**
   * Determine link type
   */
  determineLinkType(sourceTx, destTx) {
    if (sourceTx.bridgeProtocol === destTx.bridgeProtocol) {
      return 'BRIDGE_TRANSFER';
    } else if (sourceTx.tokenAddress === destTx.tokenAddress) {
      return 'SIMILAR_PATTERN';
    } else {
      return 'TIME_PROXIMITY';
    }
  }

  /**
   * Map confidence score to enum
   */
  mapConfidenceToEnum(confidence) {
    if (confidence >= 0.9) return 'CONFIRMED';
    if (confidence >= 0.7) return 'HIGH';
    if (confidence >= 0.5) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Get link key for grouping
   */
  getLinkKey(transaction) {
    return `${transaction.bridgeProtocol}_${transaction.tokenAddress}_${transaction.amount}`;
  }

  /**
   * Process pending links
   */
  async processPendingLinks() {
    try {
      for (const [key, transactions] of this.pendingLinks) {
        if (transactions.length >= 2) {
          // Try to link transactions in the group
          for (let i = 0; i < transactions.length - 1; i++) {
            for (let j = i + 1; j < transactions.length; j++) {
              await this.evaluateLink(transactions[i], transactions[j]);
            }
          }
          
          // Clear processed transactions
          this.pendingLinks.delete(key);
        }
      }
    } catch (error) {
      console.error('❌ Error processing pending links:', error.message);
    }
  }

  /**
   * Get cross-chain link statistics
   */
  async getLinkStatistics() {
    try {
      const stats = await this.prisma.detectedCrossChainLink.groupBy({
        by: ['linkType', 'confidence'],
        _count: {
          id: true
        },
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      return stats;
    } catch (error) {
      console.error('❌ Error getting link statistics:', error.message);
      return [];
    }
  }

  /**
   * Find related transactions for a wallet
   */
  async findWalletLinks(walletAddress, chain) {
    try {
      const links = await this.prisma.detectedCrossChainLink.findMany({
        where: {
          OR: [
            { sourceWalletAddress: walletAddress },
            { destinationWalletAddress: walletAddress }
          ]
        },
        include: {
          bridgeTransactions: true
        },
        orderBy: { lastSeenAt: 'desc' }
      });

      return links;
    } catch (error) {
      console.error('❌ Error finding wallet links:', error.message);
      return [];
    }
  }
}

module.exports = CrossChainLinker; 
 
 