const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

class NotificationService {
  constructor() {
    this.prisma = new PrismaClient();
    this.telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    this.telegramChatId = process.env.TELEGRAM_CHAT_ID;
    this.discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    this.isEnabled = !!(this.telegramBotToken || this.discordWebhookUrl);
  }

  /**
   * Send high-risk transaction alert
   */
  async sendHighRiskAlert(transaction, riskScore, riskFlags) {
    if (!this.isEnabled) {
      console.log('⚠️ Notifications disabled - no webhook URLs configured');
      return;
    }

    const alertMessage = this.formatHighRiskAlert(transaction, riskScore, riskFlags);
    
    try {
      // Send to Telegram
      if (this.telegramBotToken && this.telegramChatId) {
        await this.sendTelegramAlert(alertMessage);
      }

      // Send to Discord
      if (this.discordWebhookUrl) {
        await this.sendDiscordAlert(alertMessage, transaction, riskScore, riskFlags);
      }

      // Log alert in database
      await this.logAlert(transaction, riskScore, riskFlags);

      console.log('✅ High-risk alert sent successfully');
    } catch (error) {
      console.error('❌ Failed to send high-risk alert:', error.message);
    }
  }

  /**
   * Send Telegram alert
   */
  async sendTelegramAlert(message) {
    try {
      const url = `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`;
      await axios.post(url, {
        chat_id: this.telegramChatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });
      console.log('📱 Telegram alert sent');
    } catch (error) {
      console.error('❌ Telegram alert failed:', error.message);
    }
  }

  /**
   * Send Discord alert
   */
  async sendDiscordAlert(message, transaction, riskScore, riskFlags) {
    try {
      const embed = {
        title: '🚨 High-Risk Bridge Transaction Detected',
        description: message,
        color: this.getRiskColor(riskScore),
        fields: [
          {
            name: 'Transaction Hash',
            value: `\`${transaction.transactionHash}\``,
            inline: true
          },
          {
            name: 'Bridge Protocol',
            value: transaction.bridgeProtocol,
            inline: true
          },
          {
            name: 'Risk Score',
            value: `${(riskScore * 100).toFixed(1)}%`,
            inline: true
          },
          {
            name: 'Amount',
            value: `${transaction.amount} ${transaction.tokenSymbol}`,
            inline: true
          },
          {
            name: 'Source Chain',
            value: transaction.sourceChain,
            inline: true
          },
          {
            name: 'Destination Chain',
            value: transaction.destinationChain,
            inline: true
          },
          {
            name: 'Risk Flags',
            value: riskFlags.length > 0 ? riskFlags.join(', ') : 'None',
            inline: false
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'ChainHawk Compliance Platform'
        }
      };

      await axios.post(this.discordWebhookUrl, {
        embeds: [embed]
      });
      console.log('📱 Discord alert sent');
    } catch (error) {
      console.error('❌ Discord alert failed:', error.message);
    }
  }

  /**
   * Format high-risk alert message
   */
  formatHighRiskAlert(transaction, riskScore, riskFlags) {
    const riskPercentage = (riskScore * 100).toFixed(1);
    const amount = parseFloat(transaction.amount).toLocaleString();
    
    let message = `🚨 <b>HIGH-RISK BRIDGE TRANSACTION</b>\n\n`;
    message += `📊 <b>Risk Score:</b> ${riskPercentage}%\n`;
    message += `🌉 <b>Bridge:</b> ${transaction.bridgeProtocol}\n`;
    message += `💰 <b>Amount:</b> ${amount} ${transaction.tokenSymbol}\n`;
    message += `🔗 <b>Chains:</b> ${transaction.sourceChain} → ${transaction.destinationChain}\n`;
    message += `👤 <b>From:</b> <code>${transaction.sourceAddress}</code>\n`;
    message += `👤 <b>To:</b> <code>${transaction.destinationAddress}</code>\n`;
    message += `🔗 <b>Tx Hash:</b> <code>${transaction.transactionHash}</code>\n`;
    
    if (riskFlags.length > 0) {
      message += `⚠️ <b>Risk Flags:</b> ${riskFlags.join(', ')}\n`;
    }
    
    message += `\n⏰ <b>Detected:</b> ${new Date().toLocaleString()}`;
    
    return message;
  }

  /**
   * Get color based on risk score
   */
  getRiskColor(riskScore) {
    if (riskScore >= 0.8) return 0xFF0000; // Red
    if (riskScore >= 0.6) return 0xFFA500; // Orange
    if (riskScore >= 0.4) return 0xFFFF00; // Yellow
    return 0x00FF00; // Green
  }

  /**
   * Log alert in database
   */
  async logAlert(transaction, riskScore, riskFlags) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'HIGH_RISK_ALERT_SENT',
          entityType: 'BRIDGE_TRANSACTION',
          entityId: transaction.id,
          userId: 'system',
          details: {
            riskScore,
            riskFlags,
            notificationChannels: this.getActiveChannels(),
            timestamp: new Date()
          }
        }
      });
    } catch (error) {
      console.error('❌ Failed to log alert:', error.message);
    }
  }

  /**
   * Get active notification channels
   */
  getActiveChannels() {
    const channels = [];
    if (this.telegramBotToken && this.telegramChatId) channels.push('telegram');
    if (this.discordWebhookUrl) channels.push('discord');
    return channels;
  }

  /**
   * Test notification service
   */
  async testNotifications() {
    const testTransaction = {
      id: 'test-123',
      bridgeProtocol: 'Stargate',
      sourceChain: 'Ethereum',
      destinationChain: 'Polygon',
      sourceAddress: '0x1234567890123456789012345678901234567890',
      destinationAddress: '0x0987654321098765432109876543210987654321',
      amount: '1000000',
      tokenSymbol: 'USDC',
      transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    };

    await this.sendHighRiskAlert(testTransaction, 0.85, ['HIGH_VALUE', 'SANCTIONS_MATCH']);
  }
}

module.exports = NotificationService; 