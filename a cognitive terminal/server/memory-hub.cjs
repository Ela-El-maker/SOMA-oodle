/**
 * SOMA Memory Hub Server
 * 
 * Coordinates distributed memory across cluster nodes with auto-discovery.
 * Uses mDNS/Bonjour for zero-config networking.
 */

const WebSocket = require('ws');
const dgram = require('dgram');
const os = require('os');

// Try to load bonjour, fallback if not available
let bonjour;
try {
  bonjour = require('bonjour')();
} catch (e) {
  console.warn('[MemoryHub] Bonjour not available, using UDP broadcast only');
}

class MemoryHub {
  constructor(config = {}) {
    this.port = config.port || 3002;
    this.udpPort = config.udpPort || 5353;
    this.multicastAddress = '239.255.0.1';
    
    this.wss = null;
    this.udpServer = null;
    this.mdnsService = null;
    
    this.nodes = new Map(); // nodeId -> { ws, capabilities, telemetry }
    this.chunks = new Map(); // chunkId -> { nodeId, size, compressed }
    this.transfers = new Map(); // transferId -> { from, to, chunkId, status }
    
    this.metrics = {
      nodesConnected: 0,
      totalMemoryPooled: 0,
      totalChunks: 0,
      transfersCompleted: 0,
      avgTransferTime: 0
    };
  }
  
  async start() {
    console.log(`🧠 [MemoryHub] Starting on port ${this.port}...`);
    
    // Start WebSocket server
    this.wss = new WebSocket.Server({ port: this.port });
    this.wss.on('connection', this.handleConnection.bind(this));
    this.wss.on('error', (err) => {
      console.error('[MemoryHub] WebSocket error:', err.message);
    });
    
    // Start mDNS advertisement
    if (bonjour) {
      try {
        const uniqueName = `SOMA Memory Hub ${process.pid}`;
        this.mdnsService = bonjour.publish({
          name: uniqueName,
          type: 'soma-memory',
          port: this.port,
          txt: {
            version: '1.0',
            protocol: 'websocket',
            pid: process.pid.toString()
          }
        });
        console.log(`[MemoryHub] mDNS service published: ${uniqueName}`);
      } catch (error) {
        console.warn('[MemoryHub] mDNS publish failed:', error.message);
        console.warn('[MemoryHub] Continuing without mDNS (UDP fallback available)');
        // Don't throw - UDP multicast will still work
      }
    }
    
    // Start UDP broadcast (fallback)
    this.udpServer = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    this.udpServer.on('message', this.handleUdpMessage.bind(this));
    this.udpServer.bind(this.udpPort, () => {
      try {
        this.udpServer.addMembership(this.multicastAddress);
        console.log(`[MemoryHub] UDP multicast listening on ${this.multicastAddress}:${this.udpPort}`);
      } catch (error) {
        console.warn('[MemoryHub] UDP multicast setup failed:', error.message);
      }
    });
    
    // Start metrics updater
    setInterval(() => this.updateMetrics(), 5000);
    
    console.log(`✨ [MemoryHub] Online at ws://localhost:${this.port}`);
    console.log(`   mDNS: ${bonjour ? 'enabled' : 'disabled'}`);
    console.log(`   UDP: enabled on ${this.multicastAddress}:${this.udpPort}`);
  }
  
  handleConnection(ws, req) {
    const clientIp = req.socket.remoteAddress;
    console.log(`[MemoryHub] New connection from ${clientIp}`);
    
    let nodeId = null;
    
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        
        switch (msg.type) {
          case 'register':
            nodeId = msg.nodeId || `node-${Date.now()}`;
            this.nodes.set(nodeId, {
              ws,
              capabilities: msg.capabilities || {},
              telemetry: {},
              connectedAt: Date.now(),
              lastSeen: Date.now()
            });
            console.log(`[MemoryHub] Node registered: ${nodeId}`);
            ws.send(JSON.stringify({ 
              type: 'registered', 
              nodeId,
              hubInfo: {
                totalNodes: this.nodes.size,
                totalMemory: this.metrics.totalMemoryPooled
              }
            }));
            this.broadcastTopology();
            break;
            
          case 'telemetry':
            if (this.nodes.has(msg.nodeId)) {
              const node = this.nodes.get(msg.nodeId);
              node.telemetry = {
                ramFree: msg.ramFree,
                ramTotal: msg.ramTotal,
                chunks: msg.chunks || 0,
                timestamp: Date.now()
              };
              node.lastSeen = Date.now();
            }
            break;
            
          case 'allocate':
            this.handleAllocate(msg);
            break;
            
          case 'write':
            this.handleWrite(msg);
            break;
            
          case 'transfer':
            this.handleTransfer(msg);
            break;
            
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;
            
          default:
            console.warn(`[MemoryHub] Unknown message type: ${msg.type}`);
        }
      } catch (error) {
        console.error('[MemoryHub] Message handling error:', error.message);
      }
    });
    
    ws.on('close', () => {
      if (nodeId && this.nodes.has(nodeId)) {
        console.log(`[MemoryHub] Node disconnected: ${nodeId}`);
        this.nodes.delete(nodeId);
        this.broadcastTopology();
      }
    });
    
    ws.on('error', (err) => {
      console.error(`[MemoryHub] WebSocket error for ${nodeId}:`, err.message);
    });
  }
  
  handleUdpMessage(msg, rinfo) {
    try {
      const data = JSON.parse(msg.toString());
      
      if (data.type === 'discover') {
        // Respond to discovery request
        const response = {
          type: 'hub_announce',
          hubUrl: `ws://${this.getLocalIp()}:${this.port}`,
          port: this.port,
          nodes: this.nodes.size
        };
        
        const responseBuffer = Buffer.from(JSON.stringify(response));
        this.udpServer.send(responseBuffer, rinfo.port, rinfo.address);
      }
    } catch (error) {
      // Ignore malformed UDP messages
    }
  }
  
  handleAllocate(msg) {
    const { chunkId, nodeId, size } = msg;
    
    this.chunks.set(chunkId, {
      nodeId,
      size,
      compressed: false,
      allocatedAt: Date.now()
    });
    
    console.log(`[MemoryHub] Chunk allocated: ${chunkId} on ${nodeId} (${this.formatBytes(size)})`);
  }
  
  handleWrite(msg) {
    const { chunkId, nodeId, size } = msg;
    
    if (this.chunks.has(chunkId)) {
      const chunk = this.chunks.get(chunkId);
      chunk.written = true;
      chunk.size = size;
      chunk.writtenAt = Date.now();
    }
  }
  
  handleTransfer(msg) {
    const { chunkId, targetNode, size, compressed } = msg;
    const transferId = `${chunkId}-${Date.now()}`;
    
    this.transfers.set(transferId, {
      chunkId,
      targetNode,
      size,
      compressed,
      startedAt: Date.now(),
      status: 'in_progress'
    });
    
    // Notify target node
    if (this.nodes.has(targetNode)) {
      const targetWs = this.nodes.get(targetNode).ws;
      targetWs.send(JSON.stringify({
        type: 'incoming_transfer',
        transferId,
        chunkId,
        size,
        compressed
      }));
    }
    
    console.log(`[MemoryHub] Transfer initiated: ${chunkId} -> ${targetNode}`);
  }
  
  broadcastTopology() {
    const topology = {
      type: 'topology_update',
      nodes: Array.from(this.nodes.entries()).map(([id, node]) => ({
        id,
        capabilities: node.capabilities,
        telemetry: node.telemetry,
        connectedAt: node.connectedAt
      })),
      chunks: this.chunks.size,
      totalMemory: this.metrics.totalMemoryPooled
    };
    
    this.broadcast(topology);
  }
  
  broadcast(data) {
    const message = JSON.stringify(data);
    for (const [nodeId, node] of this.nodes) {
      try {
        if (node.ws.readyState === WebSocket.OPEN) {
          node.ws.send(message);
        }
      } catch (error) {
        console.error(`[MemoryHub] Broadcast error to ${nodeId}:`, error.message);
      }
    }
  }
  
  updateMetrics() {
    this.metrics.nodesConnected = this.nodes.size;
    this.metrics.totalChunks = this.chunks.size;
    
    let totalMemory = 0;
    for (const [nodeId, node] of this.nodes) {
      if (node.telemetry.ramTotal) {
        totalMemory += node.telemetry.ramTotal;
      }
    }
    this.metrics.totalMemoryPooled = totalMemory;
    
    // Clean up stale nodes (no telemetry for 30 seconds)
    const now = Date.now();
    for (const [nodeId, node] of this.nodes) {
      if (now - node.lastSeen > 30000) {
        console.log(`[MemoryHub] Removing stale node: ${nodeId}`);
        this.nodes.delete(nodeId);
      }
    }
  }
  
  getStatus() {
    return {
      port: this.port,
      nodes: Array.from(this.nodes.entries()).map(([id, node]) => ({
        id,
        capabilities: node.capabilities,
        telemetry: node.telemetry,
        uptime: Date.now() - node.connectedAt
      })),
      metrics: this.metrics,
      chunks: Array.from(this.chunks.values())
    };
  }
  
  getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return 'localhost';
  }
  
  formatBytes(bytes) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)}KB`;
    if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)}MB`;
    return `${(bytes / 1024 ** 3).toFixed(1)}GB`;
  }
  
  async stop() {
    console.log('[MemoryHub] Shutting down...');
    
    if (this.mdnsService) {
      this.mdnsService.stop();
    }
    
    if (this.udpServer) {
      this.udpServer.close();
    }
    
    if (this.wss) {
      this.wss.close();
    }
    
    if (bonjour) {
      bonjour.destroy();
    }
  }
}

// Standalone mode
if (require.main === module) {
  const hub = new MemoryHub();
  hub.start();
  
  process.on('SIGINT', async () => {
    await hub.stop();
    process.exit(0);
  });
}

module.exports = MemoryHub;
