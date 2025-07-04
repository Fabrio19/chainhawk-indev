const Queue = require('bull');
const { PrismaClient } = require("@prisma/client");
const Redis = require('ioredis');

const prisma = new PrismaClient();

class QueueManager {
  constructor() {
    this.redis = null;
    this.queues = new Map();
    this.processors = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize Redis connection and queues
   */
  async initialize() {
    try {
      // Initialize Redis connection
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3
      });

      // Initialize queues
      await this.initializeQueues();

      this.isInitialized = true;
      console.log('✅ Queue Manager initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Queue Manager:', error);
      return false;
    }
  }

  /**
   * Initialize all processing queues
   */
  async initializeQueues() {
    // Bridge transaction processing queue
    const bridgeQueue = new Queue('bridge-transactions', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      }
    });

    // Risk analysis queue
    const riskQueue = new Queue('risk-analysis', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      }
    });

    // Cross-chain linking queue
    const linkingQueue = new Queue('cross-chain-linking', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      }
    });

    // Alert generation queue
    const alertQueue = new Queue('alerts', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      }
    });

    this.queues.set('bridge-transactions', bridgeQueue);
    this.queues.set('risk-analysis', riskQueue);
    this.queues.set('cross-chain-linking', linkingQueue);
    this.queues.set('alerts', alertQueue);

    // Setup queue processors
    await this.setupQueueProcessors();
  }

  /**
   * Setup queue processors
   */
  async setupQueueProcessors() {
    // Bridge transaction processor
    const bridgeQueue = this.queues.get('bridge-transactions');
    bridgeQueue.process(async (job) => {
      return await this.processBridgeTransaction(job.data);
    });

    // Risk analysis processor
    const riskQueue = this.queues.get('risk-analysis');
    riskQueue.process(async (job) => {
      return await this.processRiskAnalysis(job.data);
    });

    // Cross-chain linking processor
    const linkingQueue = this.queues.get('cross-chain-linking');
    linkingQueue.process(async (job) => {
      return await this.processCrossChainLinking(job.data);
    });

    // Alert processor
    const alertQueue = this.queues.get('alerts');
    alertQueue.process(async (job) => {
      return await this.processAlert(job.data);
    });

    // Setup queue event listeners
    this.setupQueueEventListeners();
  }

  /**
   * Setup queue event listeners
   */
  setupQueueEventListeners() {
    for (const [name, queue] of this.queues) {
      queue.on('completed', (job, result) => {
        console.log(`✅ ${name} job completed:`, job.id);
      });

      queue.on('failed', (job, err) => {
        console.error(`❌ ${name} job failed:`, job.id, err.message);
      });

      queue.on('stalled', (job) => {
        console.warn(`⚠️ ${name} job stalled:`, job.id);
      });
    }
  }

  /**
   * Process bridge transaction
   */
  async processBridgeTransaction(data) {
    try {
      console.log('🔗 Processing bridge transaction:', data.transactionHash);

      // Save transaction to database
      const transaction = await prisma.bridgeTransaction.create({
        data: {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Add to risk analysis queue
      await this.addToQueue('risk-analysis', {
        transactionId: transaction.id,
        transactionData: data
      });

      // Add to cross-chain linking queue
      await this.addToQueue('cross-chain-linking', {
        transactionId: transaction.id,
        transactionData: data
      });

      return { success: true, transactionId: transaction.id };
    } catch (error) {
      console.error('Error processing bridge transaction:', error);
      throw error;
    }
  }

  /**
   * Process risk analysis
   */
  async processRiskAnalysis(data) {
    try {
      console.log('🎯 Processing risk analysis for transaction:', data.transactionId);

      const transaction = await prisma.bridgeTransaction.findUnique({
        where: { id: data.transactionId }
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Calculate comprehensive risk score
      const riskScore = await this.calculateComprehensiveRiskScore(transaction);

      // Update transaction with risk score
      await prisma.bridgeTransaction.update({
        where: { id: transaction.id },
        data: {
          riskScore: riskScore.score,
          riskFlags: riskScore.flags,
          analyzedAt: new Date()
        }
      });

      // Create risk score records
      for (const risk of riskScore.risks) {
        await prisma.riskScore.create({
          data: {
            entityType: 'transaction',
            entityId: transaction.id,
            riskCategory: risk.category,
            score: risk.score,
            confidence: risk.confidence,
            description: risk.description,
            evidence: risk.evidence
          }
        });
      }

      // Check if alert should be generated
      if (riskScore.score >= 0.7) {
        await this.addToQueue('alerts', {
          type: 'HIGH_RISK_TRANSACTION',
          transactionId: transaction.id,
          riskScore: riskScore.score,
          riskFlags: riskScore.flags
        });
      }

      return { success: true, riskScore: riskScore.score };
    } catch (error) {
      console.error('Error processing risk analysis:', error);
      throw error;
    }
  }

  /**
   * Process cross-chain linking
   */
  async processCrossChainLinking(data) {
    try {
      console.log('🔗 Processing cross-chain linking for transaction:', data.transactionId);

      const transaction = await prisma.bridgeTransaction.findUnique({
        where: { id: data.transactionId }
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Find potential linked transactions
      const linkedTransactions = await this.findLinkedTransactions(transaction);

      // Create cross-chain links
      for (const linkedTx of linkedTransactions) {
        await this.createCrossChainLink(transaction, linkedTx);
      }

      return { success: true, linkedCount: linkedTransactions.length };
    } catch (error) {
      console.error('Error processing cross-chain linking:', error);
      throw error;
    }
  }

  /**
   * Process alert generation
   */
  async processAlert(data) {
    try {
      console.log('🚨 Processing alert:', data.type);

      // Create alert record
      const alert = await prisma.auditLog.create({
        data: {
          action: 'ALERT_GENERATED',
          entityType: 'BRIDGE_TRANSACTION',
          entityId: data.transactionId,
          userId: 'system',
          details: {
            alertType: data.type,
            riskScore: data.riskScore,
            riskFlags: data.riskFlags,
            timestamp: new Date()
          }
        }
      });

      // Send webhook notifications
      await this.sendWebhookNotifications(data);

      // Send email notifications (if configured)
      await this.sendEmailNotifications(data);

      return { success: true, alertId: alert.id };
    } catch (error) {
      console.error('Error processing alert:', error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive risk score
   */
  async calculateComprehensiveRiskScore(transaction) {
    let totalScore = 0.0;
    const flags = [];
    const risks = [];

    // 1. High value transfer risk
    const amount = parseFloat(transaction.amount);
    if (amount > 1000000) {
      totalScore += 0.3;
      flags.push('HIGH_VALUE_TRANSFER');
      risks.push({
        category: 'HIGH_VALUE_TRANSFER',
        score: 0.3,
        confidence: 1.0,
        description: `High value transfer: ${amount}`,
        evidence: { amount, threshold: 1000000 }
      });
    }

    // 2. Frequent bridge usage risk
    const recentTransactions = await prisma.bridgeTransaction.count({
      where: {
        sourceAddress: transaction.sourceAddress,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });

    if (recentTransactions > 10) {
      totalScore += 0.2;
      flags.push('FREQUENT_BRIDGE_USAGE');
      risks.push({
        category: 'FREQUENT_BRIDGE_USAGE',
        score: 0.2,
        confidence: 0.8,
        description: `Frequent bridge usage: ${recentTransactions} transactions in 24h`,
        evidence: { recentTransactions, threshold: 10 }
      });
    }

    // 3. Sanctions risk
    const sanctionsCheck = await prisma.sanctionsWatchlist.findFirst({
      where: {
        OR: [
          { entityId: transaction.sourceAddress },
          { entityId: transaction.destinationAddress }
        ]
      }
    });

    if (sanctionsCheck) {
      totalScore += 0.5;
      flags.push('SANCTIONS_MATCH');
      risks.push({
        category: 'SANCTIONS_MATCH',
        score: 0.5,
        confidence: 1.0,
        description: `Address found in sanctions list: ${sanctionsCheck.entityId}`,
        evidence: { sanctionsId: sanctionsCheck.id }
      });
    }

    // 4. Suspicious pattern risk
    const suspiciousPatterns = await this.detectSuspiciousPatterns(transaction);
    if (suspiciousPatterns.length > 0) {
      totalScore += 0.3;
      flags.push('SUSPICIOUS_PATTERN');
      risks.push({
        category: 'SUSPICIOUS_PATTERN',
        score: 0.3,
        confidence: 0.7,
        description: `Suspicious patterns detected: ${suspiciousPatterns.join(', ')}`,
        evidence: { patterns: suspiciousPatterns }
      });
    }

    // 5. Mixer association risk
    const mixerRisk = await this.checkMixerAssociation(transaction);
    if (mixerRisk > 0) {
      totalScore += mixerRisk;
      flags.push('MIXER_ASSOCIATION');
      risks.push({
        category: 'MIXER_ASSOCIATION',
        score: mixerRisk,
        confidence: 0.6,
        description: 'Address associated with known mixers',
        evidence: { mixerRisk }
      });
    }

    return {
      score: Math.min(totalScore, 1.0),
      flags,
      risks
    };
  }

  /**
   * Detect suspicious patterns
   */
  async detectSuspiciousPatterns(transaction) {
    const patterns = [];

    // Check for circular flows
    const circularFlow = await this.detectCircularFlow(transaction);
    if (circularFlow) {
      patterns.push('CIRCULAR_FLOW');
    }

    // Check for rapid movement
    const rapidMovement = await this.detectRapidMovement(transaction);
    if (rapidMovement) {
      patterns.push('RAPID_MOVEMENT');
    }

    // Check for unusual timing
    const unusualTiming = await this.detectUnusualTiming(transaction);
    if (unusualTiming) {
      patterns.push('UNUSUAL_TIMING');
    }

    return patterns;
  }

  /**
   * Detect circular flow patterns
   */
  async detectCircularFlow(transaction) {
    // Check if source and destination addresses are the same
    if (transaction.sourceAddress === transaction.destinationAddress) {
      return true;
    }

    // Check for recent transactions between same addresses
    const recentSameFlow = await prisma.bridgeTransaction.findFirst({
      where: {
        sourceAddress: transaction.destinationAddress,
        destinationAddress: transaction.sourceAddress,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      }
    });

    return !!recentSameFlow;
  }

  /**
   * Detect rapid movement patterns
   */
  async detectRapidMovement(transaction) {
    // Check for multiple transactions in short time
    const recentTransactions = await prisma.bridgeTransaction.count({
      where: {
        sourceAddress: transaction.sourceAddress,
        createdAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
        }
      }
    });

    return recentTransactions > 5;
  }

  /**
   * Detect unusual timing patterns
   */
  async detectUnusualTiming(transaction) {
    const hour = new Date(transaction.timestamp).getHours();
    
    // Flag transactions during unusual hours (2 AM - 6 AM)
    return hour >= 2 && hour <= 6;
  }

  /**
   * Check mixer association
   */
  async checkMixerAssociation(transaction) {
    // Known mixer addresses (simplified)
    const knownMixers = [
      '0x722122df12d4e14e13ac3b6895a86e84145b6967', // Tornado Cash
      '0xdd4c48c0b24039969fc16d1cdf626eab821d3384', // Tornado Cash
      '0xd90e2f925da726b50c4ed8d0fb90ad053324f31b', // Tornado Cash
    ];

    if (knownMixers.includes(transaction.sourceAddress.toLowerCase()) ||
        knownMixers.includes(transaction.destinationAddress.toLowerCase())) {
      return 0.4;
    }

    return 0;
  }

  /**
   * Find linked transactions
   */
  async findLinkedTransactions(transaction) {
    const linkedTransactions = [];

    // Find transactions with same addresses
    const sameAddressTxs = await prisma.bridgeTransaction.findMany({
      where: {
        OR: [
          { sourceAddress: transaction.sourceAddress },
          { destinationAddress: transaction.destinationAddress }
        ],
        id: { not: transaction.id }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    linkedTransactions.push(...sameAddressTxs);

    // Find transactions with similar amounts
    const similarAmountTxs = await prisma.bridgeTransaction.findMany({
      where: {
        amount: {
          gte: (parseFloat(transaction.amount) * 0.9).toString(),
          lte: (parseFloat(transaction.amount) * 1.1).toString()
        },
        id: { not: transaction.id },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    linkedTransactions.push(...similarAmountTxs);

    return linkedTransactions;
  }

  /**
   * Create cross-chain link
   */
  async createCrossChainLink(transaction1, transaction2) {
    try {
      const link = await prisma.detectedCrossChainLink.create({
        data: {
          sourceWalletAddress: transaction1.sourceAddress,
          destinationWalletAddress: transaction1.destinationAddress,
          sourceChain: transaction1.sourceChain,
          destinationChain: transaction1.destinationChain,
          linkType: 'BRIDGE_TRANSFER',
          confidence: 'HIGH',
          tokenAddress: transaction1.tokenAddress,
          tokenSymbol: transaction1.tokenSymbol,
          totalAmount: (parseFloat(transaction1.amount) + parseFloat(transaction2.amount)).toString(),
          transactionCount: 2,
          firstSeenAt: transaction1.timestamp,
          lastSeenAt: transaction2.timestamp,
          bridgeTransactionIds: [transaction1.id, transaction2.id],
          walletFlowIds: []
        }
      });

      return link;
    } catch (error) {
      console.error('Error creating cross-chain link:', error);
    }
  }

  /**
   * Send webhook notifications
   */
  async sendWebhookNotifications(data) {
    try {
      const webhooks = await prisma.webhook.findMany({
        where: { isActive: true }
      });

      for (const webhook of webhooks) {
        // Send webhook notification
        console.log(`📡 Sending webhook to: ${webhook.url}`);
      }
    } catch (error) {
      console.error('Error sending webhook notifications:', error);
    }
  }

  /**
   * Send email notifications
   */
  async sendEmailNotifications(data) {
    try {
      // Email notification logic would go here
      console.log('📧 Sending email notification for alert');
    } catch (error) {
      console.error('Error sending email notifications:', error);
    }
  }

  /**
   * Add job to queue
   */
  async addToQueue(queueName, data, options = {}) {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      const job = await queue.add(data, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        ...options
      });

      console.log(`📋 Added job to ${queueName} queue:`, job.id);
      return job;
    } catch (error) {
      console.error(`Error adding job to ${queueName} queue:`, error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const stats = {};

    for (const [name, queue] of this.queues) {
      const jobCounts = await queue.getJobCounts();
      stats[name] = jobCounts;
    }

    return stats;
  }

  /**
   * Clean up queues
   */
  async cleanup() {
    try {
      for (const [name, queue] of this.queues) {
        await queue.close();
      }

      if (this.redis) {
        await this.redis.quit();
      }

      console.log('✅ Queue Manager cleaned up');
    } catch (error) {
      console.error('❌ Error cleaning up Queue Manager:', error);
    }
  }
}

module.exports = QueueManager; 