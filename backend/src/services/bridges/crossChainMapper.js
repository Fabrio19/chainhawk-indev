const { PrismaClient } = require("@prisma/client");

class CrossChainMapper {
  constructor() {
    this.prisma = new PrismaClient();
    this.pendingMappings = new Map();
    this.mappingCache = new Map();
  }

  /**
   * Create or update cross-chain mapping
   */
  async createOrUpdateMapping(mappingData) {
    try {
      const {
        bridgeProtocol,
        messageId,
        nonce,
        srcChainId,
        dstChainId,
        amount,
        token,
        sourceAddress,
        destinationAddress,
        signatureVerified,
        validators,
        confidence,
        metadata
      } = mappingData;

      console.log(`🔗 Creating cross-chain mapping: ${srcChainId} -> ${dstChainId} via ${bridgeProtocol}`);

      // Create mapping record
      const mapping = await this.prisma.detectedCrossChainLink.create({
        data: {
          sourceWalletAddress: sourceAddress,
          destinationWalletAddress: destinationAddress || sourceAddress,
          sourceChain: this.mapChainId(srcChainId),
          destinationChain: this.mapChainId(dstChainId),
          linkType: 'BRIDGE_TRANSFER',
          confidence: this.mapConfidenceToEnum(confidence),
          tokenAddress: token,
          tokenSymbol: this.getTokenSymbol(token),
          totalAmount: amount,
          transactionCount: 1,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
          riskScore: this.calculateMappingRiskScore(mappingData),
          riskFlags: this.generateRiskFlags(mappingData),
          metadata: {
            bridgeProtocol,
            messageId,
            nonce,
            signatureVerified,
            validators,
            confidence,
            ...metadata
          },
          bridgeTransactionIds: [],
          walletFlowIds: []
        }
      });

      // Cache the mapping
      this.cacheMapping(messageId, mapping);

      console.log(`✅ Cross-chain mapping created: ${mapping.id}`);
      return mapping;

    } catch (error) {
      console.error('❌ Error creating cross-chain mapping:', error.message);
      throw error;
    }
  }

  /**
   * Link source and destination transactions
   */
  async linkTransactions(sourceTx, destinationTx) {
    try {
      const linkKey = this.getLinkKey(sourceTx, destinationTx);
      
      // Check if already linked
      const existingLink = await this.findExistingLink(sourceTx, destinationTx);
      if (existingLink) {
        console.log(`ℹ️ Transactions already linked: ${existingLink.id}`);
        return existingLink;
      }

      // Create cross-chain link
      const link = await this.prisma.detectedCrossChainLink.create({
        data: {
          sourceWalletAddress: sourceTx.sourceAddress,
          destinationWalletAddress: destinationTx.destinationAddress || destinationTx.sourceAddress,
          sourceChain: sourceTx.sourceChain,
          destinationChain: destinationTx.sourceChain,
          linkType: 'BRIDGE_TRANSFER',
          confidence: 'HIGH',
          tokenAddress: sourceTx.tokenAddress,
          tokenSymbol: sourceTx.tokenSymbol,
          totalAmount: sourceTx.amount,
          transactionCount: 2,
          firstSeenAt: sourceTx.timestamp,
          lastSeenAt: destinationTx.timestamp,
          riskScore: (sourceTx.riskScore + destinationTx.riskScore) / 2,
          riskFlags: this.combineRiskFlags(sourceTx.riskFlags, destinationTx.riskFlags),
          metadata: {
            bridgeProtocol: sourceTx.bridgeProtocol,
            sourceTxHash: sourceTx.transactionHash,
            destTxHash: destinationTx.transactionHash,
            sourceEvent: sourceTx.eventType,
            destEvent: destinationTx.eventType,
            timeDifference: destinationTx.timestamp.getTime() - sourceTx.timestamp.getTime()
          },
          bridgeTransactionIds: [sourceTx.id, destinationTx.id],
          walletFlowIds: []
        }
      });

      // Update bridge transactions with link reference
      await this.prisma.bridgeTransaction.updateMany({
        where: {
          id: { in: [sourceTx.id, destinationTx.id] }
        },
        data: {
          linkedTransactionId: link.id
        }
      });

      console.log(`🔗 Linked transactions: ${sourceTx.transactionHash} -> ${destinationTx.transactionHash}`);
      return link;

    } catch (error) {
      console.error('❌ Error linking transactions:', error.message);
      throw error;
    }
  }

  /**
   * Find existing link between transactions
   */
  async findExistingLink(sourceTx, destinationTx) {
    try {
      const link = await this.prisma.detectedCrossChainLink.findFirst({
        where: {
          OR: [
            {
              AND: [
                { sourceWalletAddress: sourceTx.sourceAddress },
                { destinationWalletAddress: destinationTx.destinationAddress || destinationTx.sourceAddress },
                { sourceChain: sourceTx.sourceChain },
                { destinationChain: destinationTx.sourceChain }
              ]
            },
            {
              AND: [
                { sourceWalletAddress: destinationTx.sourceAddress },
                { destinationWalletAddress: sourceTx.destinationAddress || sourceTx.sourceAddress },
                { sourceChain: destinationTx.sourceChain },
                { destinationChain: sourceTx.sourceChain }
              ]
            }
          ]
        }
      });

      return link;
    } catch (error) {
      console.error('❌ Error finding existing link:', error.message);
      return null;
    }
  }

  /**
   * Map chain ID to chain name
   */
  mapChainId(chainId) {
    const chainMap = {
      1: 'ethereum',
      56: 'bsc',
      137: 'polygon',
      42161: 'arbitrum',
      10: 'optimism',
      43114: 'avalanche',
      1399811150: 'solana'
    };

    return chainMap[chainId] || `chain-${chainId}`;
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
   * Get token symbol from address
   */
  getTokenSymbol(tokenAddress) {
    const tokenSymbols = {
      '0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C': 'USDC',
      '0xdAC17F958D2ee523a2206206994597C13D831ec7': 'USDT',
      '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': 'WBTC',
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 'WETH',
      '0x6B175474E89094C44Da98b954EedeAC495271d0F': 'DAI'
    };

    return tokenSymbols[tokenAddress] || 'Unknown';
  }

  /**
   * Calculate mapping risk score
   */
  calculateMappingRiskScore(mappingData) {
    let riskScore = 0;

    // Signature verification risk
    if (!mappingData.signatureVerified) {
      riskScore += 0.3;
    }

    // Confidence-based risk
    riskScore += (1 - mappingData.confidence) * 0.2;

    // Amount-based risk (if available)
    if (mappingData.amount) {
      const amount = parseFloat(mappingData.amount);
      if (amount > 1000000000) { // > 1B tokens
        riskScore += 0.3;
      } else if (amount > 100000000) { // > 100M tokens
        riskScore += 0.2;
      }
    }

    return Math.min(riskScore, 1.0);
  }

  /**
   * Generate risk flags for mapping
   */
  generateRiskFlags(mappingData) {
    const flags = [];

    if (!mappingData.signatureVerified) {
      flags.push('UNVERIFIED_SIGNATURE');
    }

    if (mappingData.confidence < 0.7) {
      flags.push('LOW_CONFIDENCE');
    }

    if (mappingData.amount && parseFloat(mappingData.amount) > 1000000000) {
      flags.push('HIGH_VALUE_TRANSFER');
    }

    return flags;
  }

  /**
   * Combine risk flags from multiple transactions
   */
  combineRiskFlags(flags1, flags2) {
    const combined = new Set();
    
    if (flags1) {
      flags1.forEach(flag => combined.add(flag));
    }
    
    if (flags2) {
      flags2.forEach(flag => combined.add(flag));
    }
    
    return Array.from(combined);
  }

  /**
   * Get link key for transactions
   */
  getLinkKey(sourceTx, destinationTx) {
    return `${sourceTx.bridgeProtocol}_${sourceTx.sourceAddress}_${destinationTx.sourceAddress}_${sourceTx.amount}`;
  }

  /**
   * Cache mapping
   */
  cacheMapping(messageId, mapping) {
    this.mappingCache.set(messageId, {
      mapping,
      timestamp: Date.now()
    });

    // Clean cache if too large
    if (this.mappingCache.size > 1000) {
      this.cleanMappingCache();
    }
  }

  /**
   * Clean mapping cache
   */
  cleanMappingCache() {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [key, value] of this.mappingCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.mappingCache.delete(key);
      }
    }

    console.log(`🧹 Cleaned mapping cache, ${this.mappingCache.size} entries remaining`);
  }

  /**
   * Find cross-chain links for a wallet
   */
  async findWalletLinks(walletAddress, chain = null) {
    try {
      const whereClause = {
        OR: [
          { sourceWalletAddress: walletAddress.toLowerCase() },
          { destinationWalletAddress: walletAddress.toLowerCase() }
        ]
      };

      if (chain) {
        whereClause.OR = whereClause.OR.map(condition => ({
          ...condition,
          OR: [
            { sourceChain: chain },
            { destinationChain: chain }
          ]
        }));
      }

      const links = await this.prisma.detectedCrossChainLink.findMany({
        where: whereClause,
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

  /**
   * Get cross-chain mapping statistics
   */
  async getMappingStatistics() {
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
      console.error('❌ Error getting mapping statistics:', error.message);
      return [];
    }
  }

  /**
   * Update mapping status
   */
  async updateMappingStatus(mappingId, status, metadata = {}) {
    try {
      const mapping = await this.prisma.detectedCrossChainLink.update({
        where: { id: mappingId },
        data: {
          metadata: {
            ...metadata,
            status,
            updatedAt: new Date()
          }
        }
      });

      console.log(`✅ Updated mapping status: ${mappingId} -> ${status}`);
      return mapping;
    } catch (error) {
      console.error('❌ Error updating mapping status:', error.message);
      throw error;
    }
  }

  /**
   * Get pending mappings
   */
  getPendingMappings() {
    return Array.from(this.pendingMappings.values());
  }

  /**
   * Process pending mappings
   */
  async processPendingMappings() {
    try {
      for (const [key, mappingData] of this.pendingMappings) {
        await this.createOrUpdateMapping(mappingData);
        this.pendingMappings.delete(key);
      }
    } catch (error) {
      console.error('❌ Error processing pending mappings:', error.message);
    }
  }

  /**
   * Export mapping data
   */
  async exportMappingData(mappingId) {
    try {
      const mapping = await this.prisma.detectedCrossChainLink.findUnique({
        where: { id: mappingId },
        include: {
          bridgeTransactions: true
        }
      });

      return mapping;
    } catch (error) {
      console.error('❌ Error exporting mapping data:', error.message);
      return null;
    }
  }

  /**
   * Get mapping by message ID
   */
  async getMappingByMessageId(messageId) {
    try {
      const mapping = await this.prisma.detectedCrossChainLink.findFirst({
        where: {
          metadata: {
            path: ['messageId'],
            equals: messageId
          }
        }
      });

      return mapping;
    } catch (error) {
      console.error('❌ Error getting mapping by message ID:', error.message);
      return null;
    }
  }
}

module.exports = CrossChainMapper; 
 
 