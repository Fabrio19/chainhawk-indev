const { PrismaClient } = require("@prisma/client");

class RiskScoringEngine {
  constructor() {
    this.prisma = new PrismaClient();
    this.riskThresholds = {
      HIGH_AMOUNT: 100000, // $100k USD equivalent
      FREQUENT_TRANSFER: 10, // transactions per hour
      SUSPICIOUS_PATTERN: 0.8, // pattern similarity threshold
      SANCTIONS_MATCH: 1.0, // immediate high risk
      MIXER_ASSOCIATION: 0.9, // very high risk
      DARKNET_ASSOCIATION: 0.95, // extremely high risk
      INR_10L_THRESHOLD: 1000000, // ₹10 Lakh threshold (10,00,000 INR)
      INR_50L_THRESHOLD: 5000000, // ₹50 Lakh threshold
      INR_1CR_THRESHOLD: 10000000 // ₹1 Crore threshold
    };
  }

  /**
   * Assess comprehensive risk for bridge transaction
   */
  async assessBridgeTransaction(transaction) {
    try {
      let totalScore = 0.0;
      const flags = [];
      const risks = [];

      // 1. Amount-based risk assessment
      const amountRisk = await this.assessAmountRisk(transaction);
      if (amountRisk.score > 0) {
        totalScore += amountRisk.score;
        risks.push(amountRisk);
        if (amountRisk.description.includes('₹10 Lakh')) flags.push('INR_10L_THRESHOLD');
        if (amountRisk.description.includes('₹50 Lakh')) flags.push('INR_50L_THRESHOLD');
        if (amountRisk.description.includes('₹1 Crore')) flags.push('INR_1CR_THRESHOLD');
        if (amountRisk.description.includes('High value')) flags.push('HIGH_VALUE_TRANSFER');
      }

      // 2. Frequency-based risk
      const frequencyRisk = await this.assessFrequencyRisk(transaction);
      if (frequencyRisk.score > 0) {
        totalScore += frequencyRisk.score;
        risks.push(frequencyRisk);
        flags.push('FREQUENT_TRANSFER');
      }

      // 3. Pattern-based risk
      const patternRisk = await this.assessPatternRisk(transaction);
      if (patternRisk.score > 0) {
        totalScore += patternRisk.score;
        risks.push(patternRisk);
        flags.push('SUSPICIOUS_PATTERN');
      }

      // 4. Sanctions risk
      const sanctionsRisk = await this.assessSanctionsRisk(transaction);
      if (sanctionsRisk.score > 0) {
        totalScore += sanctionsRisk.score;
        risks.push(sanctionsRisk);
        flags.push('SANCTIONS_MATCH');
      }

      // 5. Timing risk
      const timingRisk = await this.assessTimingRisk(transaction);
      if (timingRisk.score > 0) {
        totalScore += timingRisk.score;
        risks.push(timingRisk);
        flags.push('UNUSUAL_TIMING');
      }

      // 6. Bridge-specific risk
      const bridgeRisk = await this.assessBridgeSpecificRisk(transaction);
      if (bridgeRisk.score > 0) {
        totalScore += bridgeRisk.score;
        risks.push(bridgeRisk);
        flags.push('BRIDGE_SPECIFIC_RISK');
      }

      return {
        score: Math.min(totalScore / 100, 1.0), // Normalize to 0-1
        flags: [...new Set(flags)], // Remove duplicates
        risks: risks,
        assessedAt: new Date()
      };
    } catch (error) {
      console.error('Error assessing bridge transaction risk:', error);
      return {
        score: 0.0,
        flags: ['ASSESSMENT_ERROR'],
        risks: [],
        assessedAt: new Date()
      };
    }
  }

  /**
   * Assess amount-based risk with INR thresholds
   */
  async assessAmountRisk(transaction) {
    try {
      const amount = parseFloat(transaction.amount);
      const tokenValue = await this.getTokenValue(transaction.tokenAddress, transaction.tokenSymbol);
      const usdValue = amount * tokenValue;
      
      // Convert USD to INR (approximate rate)
      const inrValue = usdValue * 83; // 1 USD ≈ 83 INR

      let score = 0;
      let description = '';

      // Check INR thresholds first
      if (inrValue >= this.riskThresholds.INR_1CR_THRESHOLD) {
        score = 40;
        description = `₹1 Crore+ transfer: ₹${(inrValue / 10000000).toFixed(2)} Crore ($${(usdValue / 1000000).toFixed(2)}M USD)`;
      } else if (inrValue >= this.riskThresholds.INR_50L_THRESHOLD) {
        score = 30;
        description = `₹50 Lakh+ transfer: ₹${(inrValue / 100000).toFixed(2)} Lakh ($${(usdValue / 100000).toFixed(2)}K USD)`;
      } else if (inrValue >= this.riskThresholds.INR_10L_THRESHOLD) {
        score = 20;
        description = `₹10 Lakh+ transfer: ₹${(inrValue / 100000).toFixed(2)} Lakh ($${(usdValue / 1000).toFixed(2)}K USD)`;
      } else if (usdValue > this.riskThresholds.HIGH_AMOUNT) {
        score = Math.min((usdValue / this.riskThresholds.HIGH_AMOUNT) * 15, 25);
        description = `High value transfer: $${usdValue.toFixed(2)} USD (₹${inrValue.toFixed(2)} INR)`;
      }

      return { score, description };
    } catch (error) {
      return { score: 0, description: '' };
    }
  }

  /**
   * Assess frequency-based risk
   */
  async assessFrequencyRisk(transaction) {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const recentTransactions = await this.prisma.bridgeTransaction.count({
        where: {
          OR: [
            { sourceAddress: transaction.sourceAddress },
            { destinationAddress: transaction.destinationAddress }
          ],
          timestamp: {
            gte: oneHourAgo
          }
        }
      });

      if (recentTransactions > this.riskThresholds.FREQUENT_TRANSFER) {
        return {
          score: Math.min((recentTransactions / this.riskThresholds.FREQUENT_TRANSFER) * 15, 30),
          description: `Frequent transfers: ${recentTransactions} in the last hour`
        };
      }

      return { score: 0, description: '' };
    } catch (error) {
      return { score: 0, description: '' };
    }
  }

  /**
   * Assess pattern risk
   */
  async assessPatternRisk(transaction) {
    try {
      // Look for circular patterns
      const circularPattern = await this.detectCircularPattern(transaction);
      if (circularPattern) {
        return {
          score: 25,
          description: 'Circular transfer pattern detected'
        };
      }

      // Look for rapid movement patterns
      const rapidMovement = await this.detectRapidMovement(transaction);
      if (rapidMovement) {
        return {
          score: 20,
          description: 'Rapid cross-chain movement detected'
        };
      }

      return { score: 0, description: '' };
    } catch (error) {
      return { score: 0, description: '' };
    }
  }

  /**
   * Assess sanctions risk
   */
  async assessSanctionsRisk(transaction) {
    try {
      const sourceSanctions = await this.prisma.sanctionsWatchlist.findFirst({
        where: { 
          entityId: transaction.sourceAddress,
          isActive: true
        }
      });

      const destSanctions = await this.prisma.sanctionsWatchlist.findFirst({
        where: { 
          entityId: transaction.destinationAddress,
          isActive: true
        }
      });

      if (sourceSanctions || destSanctions) {
        return {
          score: 50,
          description: `Sanctions match: ${sourceSanctions ? 'source' : ''}${sourceSanctions && destSanctions ? ' and ' : ''}${destSanctions ? 'destination' : ''} address`
        };
      }

      return { score: 0, description: '' };
    } catch (error) {
      return { score: 0, description: '' };
    }
  }

  /**
   * Assess timing risk
   */
  async assessTimingRisk(transaction) {
    try {
      const hour = transaction.timestamp.getHours();
      
      // Unusual hours (2 AM - 6 AM UTC)
      if (hour >= 2 && hour <= 6) {
        return {
          score: 10,
          description: 'Transaction during unusual hours'
        };
      }

      // Weekend transactions might be higher risk
      const dayOfWeek = transaction.timestamp.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
        return {
          score: 5,
          description: 'Weekend transaction'
        };
      }

      return { score: 0, description: '' };
    } catch (error) {
      return { score: 0, description: '' };
    }
  }

  /**
   * Assess bridge-specific risk
   */
  async assessBridgeSpecificRisk(transaction) {
    try {
      let score = 0;
      let description = '';

      // Check for specific bridge risks
      switch (transaction.bridgeProtocol.toLowerCase()) {
        case 'tornado cash':
          score = 40;
          description = 'Tornado Cash mixer detected';
          break;
        case 'mixer':
          score = 35;
          description = 'Cryptocurrency mixer detected';
          break;
        case 'unknown':
          score = 15;
          description = 'Unknown bridge protocol';
          break;
      }

      return { score, description };
    } catch (error) {
      return { score: 0, description: '' };
    }
  }

  /**
   * Detect circular transfer patterns
   */
  async detectCircularPattern(transaction) {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const recentTransactions = await this.prisma.bridgeTransaction.findMany({
        where: {
          OR: [
            { sourceAddress: transaction.sourceAddress },
            { destinationAddress: transaction.destinationAddress }
          ],
          timestamp: {
            gte: oneDayAgo
          }
        },
        orderBy: { timestamp: 'asc' }
      });

      // Look for A -> B -> A patterns
      const addresses = recentTransactions.map(tx => 
        tx.sourceAddress === transaction.sourceAddress ? tx.destinationAddress : tx.sourceAddress
      );

      return addresses.includes(transaction.destinationAddress);
    } catch (error) {
      return false;
    }
  }

  /**
   * Detect rapid movement patterns
   */
  async detectRapidMovement(transaction) {
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      
      const recentTransactions = await this.prisma.bridgeTransaction.count({
        where: {
          OR: [
            { sourceAddress: transaction.sourceAddress },
            { destinationAddress: transaction.destinationAddress }
          ],
          timestamp: {
            gte: tenMinutesAgo
          }
        }
      });

      return recentTransactions > 5;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get token value in USD
   */
  async getTokenValue(tokenAddress, tokenSymbol) {
    try {
      // This would typically call a price API
      // For now, use approximate values
      const tokenValues = {
        'USDC': 1.0,
        'USDT': 1.0,
        'ETH': 3000,
        'BTC': 50000,
        'MATIC': 1.0,
        'BNB': 300
      };

      return tokenValues[tokenSymbol] || 1.0;
    } catch (error) {
      return 1.0; // Default to $1 if price lookup fails
    }
  }
}

module.exports = RiskScoringEngine; 
 




