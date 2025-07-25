const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

class WebSocketService {
  constructor(server) {
    this.prisma = new PrismaClient();
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // Map of client connections
    this.rooms = new Map(); // Map of room subscriptions
    this.heartbeatInterval = null;
    this.isRunning = false;

    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  /**
   * Setup WebSocket server with authentication and event handling
   */
  setupWebSocketServer() {
    this.wss.on('connection', async (ws, req) => {
      try {
        console.log('🔌 New WebSocket connection attempt');

        // Authenticate the connection
        const authenticated = await this.authenticateConnection(ws, req);
        if (!authenticated) {
          ws.close(1008, 'Authentication failed');
          return;
        }

        // Setup client
        const clientId = this.generateClientId();
        this.clients.set(clientId, {
          ws,
          userId: ws.userId,
          userRole: ws.userRole,
          subscriptions: new Set(),
          lastHeartbeat: Date.now(),
          connectedAt: Date.now()
        });

        console.log(`✅ WebSocket client connected: ${clientId} (User: ${ws.userId})`);

        // Send welcome message
        this.sendToClient(clientId, {
          type: 'CONNECTION_ESTABLISHED',
          clientId,
          timestamp: new Date().toISOString(),
          message: 'WebSocket connection established successfully'
        });

        // Setup message handlers
        ws.on('message', (data) => this.handleMessage(clientId, data));
        ws.on('close', () => this.handleDisconnect(clientId));
        ws.on('error', (error) => this.handleError(clientId, error));

      } catch (error) {
        console.error('❌ WebSocket connection error:', error);
        ws.close(1011, 'Internal server error');
      }
    });
  }

  /**
   * Authenticate WebSocket connection
   */
  async authenticateConnection(ws, req) {
    try {
      // Extract token from query parameters or headers
      const token = req.url.split('token=')[1] || req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        console.log('❌ No authentication token provided');
        return false;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { id: true, email: true, role: true, status: true }
      });

      if (!user || user.status !== 'active') {
        console.log('❌ Invalid or inactive user');
        return false;
      }

      // Attach user info to WebSocket connection
      ws.userId = user.id;
      ws.userEmail = user.email;
      ws.userRole = user.role;

      return true;
    } catch (error) {
      console.error('❌ WebSocket authentication error:', error);
      return false;
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  async handleMessage(clientId, data) {
    try {
      const message = JSON.parse(data);
      const client = this.clients.get(clientId);

      if (!client) {
        console.log('❌ Unknown client:', clientId);
        return;
      }

      console.log(`📨 Message from ${clientId}:`, message.type);

      switch (message.type) {
        case 'SUBSCRIBE':
          await this.handleSubscribe(clientId, message);
          break;

        case 'UNSUBSCRIBE':
          await this.handleUnsubscribe(clientId, message);
          break;

        case 'HEARTBEAT':
          this.handleHeartbeat(clientId);
          break;

        case 'GET_SUBSCRIPTIONS':
          this.sendSubscriptions(clientId);
          break;

        default:
          console.log('❌ Unknown message type:', message.type);
          this.sendToClient(clientId, {
            type: 'ERROR',
            error: 'Unknown message type',
            timestamp: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('❌ Error handling WebSocket message:', error);
    }
  }

  /**
   * Handle subscription requests
   */
  async handleSubscribe(clientId, message) {
    const client = this.clients.get(clientId);
    const { channels = [] } = message;

    if (!client) return;

    for (const channel of channels) {
      // Validate channel access based on user role
      if (this.canSubscribeToChannel(client.userRole, channel)) {
        client.subscriptions.add(channel);
        
        // Add to room
        if (!this.rooms.has(channel)) {
          this.rooms.set(channel, new Set());
        }
        this.rooms.get(channel).add(clientId);

        console.log(`📡 Client ${clientId} subscribed to ${channel}`);
      } else {
        console.log(`❌ Client ${clientId} denied access to ${channel}`);
      }
    }

    this.sendToClient(clientId, {
      type: 'SUBSCRIBED',
      channels: Array.from(client.subscriptions),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle unsubscribe requests
   */
  async handleUnsubscribe(clientId, message) {
    const client = this.clients.get(clientId);
    const { channels = [] } = message;

    if (!client) return;

    for (const channel of channels) {
      client.subscriptions.delete(channel);
      
      // Remove from room
      const room = this.rooms.get(channel);
      if (room) {
        room.delete(clientId);
        if (room.size === 0) {
          this.rooms.delete(channel);
        }
      }

      console.log(`📡 Client ${clientId} unsubscribed from ${channel}`);
    }

    this.sendToClient(clientId, {
      type: 'UNSUBSCRIBED',
      channels: Array.from(client.subscriptions),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle client heartbeat
   */
  handleHeartbeat(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastHeartbeat = Date.now();
    }
  }

  /**
   * Send current subscriptions to client
   */
  sendSubscriptions(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      this.sendToClient(clientId, {
        type: 'SUBSCRIPTIONS',
        channels: Array.from(client.subscriptions),
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      // Remove from all rooms
      for (const channel of client.subscriptions) {
        const room = this.rooms.get(channel);
        if (room) {
          room.delete(clientId);
          if (room.size === 0) {
            this.rooms.delete(channel);
          }
        }
      }

      this.clients.delete(clientId);
      console.log(`🔌 Client disconnected: ${clientId}`);
    }
  }

  /**
   * Handle WebSocket errors
   */
  handleError(clientId, error) {
    console.error(`❌ WebSocket error for client ${clientId}:`, error);
    this.handleDisconnect(clientId);
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`❌ Error sending message to client ${clientId}:`, error);
        this.handleDisconnect(clientId);
      }
    }
  }

  /**
   * Broadcast message to all clients subscribed to a channel
   */
  broadcastToChannel(channel, message) {
    const room = this.rooms.get(channel);
    if (room) {
      const messageWithTimestamp = {
        ...message,
        timestamp: new Date().toISOString(),
        channel
      };

      room.forEach(clientId => {
        this.sendToClient(clientId, messageWithTimestamp);
      });

      console.log(`📡 Broadcasted to ${room.size} clients in ${channel}:`, message.type);
    }
  }

  /**
   * Broadcast to all connected clients
   */
  broadcastToAll(message) {
    const messageWithTimestamp = {
      ...message,
      timestamp: new Date().toISOString()
    };

    this.clients.forEach((client, clientId) => {
      this.sendToClient(clientId, messageWithTimestamp);
    });

    console.log(`📡 Broadcasted to all ${this.clients.size} clients:`, message.type);
  }

  /**
   * Send high-risk transaction alert
   */
  sendHighRiskAlert(transaction, riskScore, riskFlags) {
    const alert = {
      type: 'HIGH_RISK_ALERT',
      severity: 'HIGH',
      transaction: {
        hash: transaction.transactionHash,
        amount: transaction.amount,
        token: transaction.tokenSymbol,
        sourceChain: transaction.sourceChain,
        destinationChain: transaction.destinationChain,
        sourceAddress: transaction.sourceAddress,
        destinationAddress: transaction.destinationAddress,
        bridgeProtocol: transaction.bridgeProtocol
      },
      riskScore,
      riskFlags,
      message: `High-risk transaction detected: ${transaction.amount} ${transaction.tokenSymbol} via ${transaction.bridgeProtocol}`
    };

    this.broadcastToChannel('alerts', alert);
    this.broadcastToChannel('high-risk', alert);
  }

  /**
   * Send bridge monitoring update
   */
  sendBridgeUpdate(update) {
    const message = {
      type: 'BRIDGE_UPDATE',
      ...update
    };

    this.broadcastToChannel('bridge-monitoring', message);
  }

  /**
   * Send system status update
   */
  sendSystemStatus(status) {
    const message = {
      type: 'SYSTEM_STATUS',
      status,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };

    this.broadcastToChannel('system', message);
  }

  /**
   * Send compliance case update
   */
  sendCaseUpdate(caseData) {
    const message = {
      type: 'CASE_UPDATE',
      case: {
        id: caseData.id,
        title: caseData.title,
        status: caseData.status,
        riskScore: caseData.riskScore,
        updatedAt: caseData.updatedAt
      }
    };

    this.broadcastToChannel('cases', message);
  }

  /**
   * Send real-time transaction
   */
  sendTransaction(transaction) {
    const message = {
      type: 'NEW_TRANSACTION',
      transaction: {
        hash: transaction.transactionHash,
        amount: transaction.amount,
        token: transaction.tokenSymbol,
        sourceChain: transaction.sourceChain,
        destinationChain: transaction.destinationChain,
        riskScore: transaction.riskScore,
        timestamp: transaction.timestamp
      }
    };

    this.broadcastToChannel('transactions', message);
  }

  /**
   * Check if user can subscribe to channel
   */
  canSubscribeToChannel(userRole, channel) {
    const channelPermissions = {
      'alerts': ['admin', 'analyst', 'partner'],
      'high-risk': ['admin', 'analyst'],
      'bridge-monitoring': ['admin', 'analyst', 'partner'],
      'system': ['admin'],
      'cases': ['admin', 'analyst'],
      'transactions': ['admin', 'analyst', 'partner']
    };

    return channelPermissions[channel]?.includes(userRole) || false;
  }

  /**
   * Generate unique client ID
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start heartbeat to detect stale connections
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const staleThreshold = 30000; // 30 seconds

      this.clients.forEach((client, clientId) => {
        if (now - client.lastHeartbeat > staleThreshold) {
          console.log(`💀 Stale connection detected: ${clientId}`);
          client.ws.close(1000, 'Connection timeout');
          this.handleDisconnect(clientId);
        }
      });
    }, 10000); // Check every 10 seconds
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalConnections: this.clients.size,
      activeRooms: this.rooms.size,
      roomStats: Object.fromEntries(
        Array.from(this.rooms.entries()).map(([channel, room]) => [
          channel,
          room.size
        ])
      ),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Gracefully shutdown WebSocket service
   */
  async shutdown() {
    console.log('🛑 Shutting down WebSocket service...');
    
    this.stopHeartbeat();
    
    // Close all connections
    this.clients.forEach((client, clientId) => {
      client.ws.close(1000, 'Server shutdown');
    });
    
    this.clients.clear();
    this.rooms.clear();
    
    // Close WebSocket server
    this.wss.close();
    
    console.log('✅ WebSocket service shutdown complete');
  }
}

module.exports = WebSocketService;
