/**
 * SOMA Discovery Client
 * 
 * Auto-discovers memory hub using mDNS/Bonjour and UDP broadcast.
 * Returns hub WebSocket URL or falls back to localhost.
 */

const dgram = require('dgram');

// Try to load bonjour
let bonjour;
try {
  bonjour = require('bonjour')();
} catch (e) {
  console.warn('[Discovery] Bonjour not available, using UDP only');
}

class DiscoveryClient {
  constructor(config = {}) {
    this.timeout = config.timeout || 5000;
    this.udpPort = config.udpPort || 5353;
    this.multicastAddress = '239.255.0.1';
    this.fallbackUrl = config.fallbackUrl || 'ws://localhost:3002';
  }
  
  /**
   * Discover memory hub using mDNS and UDP
   * Returns hub WebSocket URL or null if not found
   */
  async discover() {
    console.log('[Discovery] Searching for SOMA memory hub...');
    
    // Try mDNS first (fastest)
    if (bonjour) {
      const mdnsResult = await this.discoverViaMdns();
      if (mdnsResult) {
        console.log(`[Discovery] Found hub via mDNS: ${mdnsResult}`);
        return mdnsResult;
      }
    }
    
    // Try UDP broadcast (fallback)
    const udpResult = await this.discoverViaUdp();
    if (udpResult) {
      console.log(`[Discovery] Found hub via UDP: ${udpResult}`);
      return udpResult;
    }
    
    // No hub found, use fallback
    console.log(`[Discovery] No hub found, using fallback: ${this.fallbackUrl}`);
    return this.fallbackUrl;
  }
  
  /**
   * Discover via mDNS/Bonjour
   */
  discoverViaMdns() {
    if (!bonjour) return Promise.resolve(null);
    
    return new Promise((resolve) => {
      const browser = bonjour.find({ type: 'soma-memory' });
      
      const timeout = setTimeout(() => {
        browser.stop();
        resolve(null);
      }, this.timeout);
      
      browser.on('up', (service) => {
        clearTimeout(timeout);
        browser.stop();
        
        // Get first available address
        const address = service.addresses?.[0] || service.host || 'localhost';
        const port = service.port || 3002;
        const url = `ws://${address}:${port}`;
        
        resolve(url);
      });
    });
  }
  
  /**
   * Discover via UDP multicast
   */
  discoverViaUdp() {
    return new Promise((resolve) => {
      const client = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      
      const timeout = setTimeout(() => {
        client.close();
        resolve(null);
      }, this.timeout);
      
      client.on('message', (msg, rinfo) => {
        try {
          const data = JSON.parse(msg.toString());
          
          if (data.type === 'hub_announce' && data.hubUrl) {
            clearTimeout(timeout);
            client.close();
            resolve(data.hubUrl);
          }
        } catch (error) {
          // Ignore malformed messages
        }
      });
      
      client.bind(this.udpPort, () => {
        try {
          client.addMembership(this.multicastAddress);
          
          // Send discovery request
          const request = JSON.stringify({ type: 'discover', timestamp: Date.now() });
          const buffer = Buffer.from(request);
          client.send(buffer, this.udpPort, this.multicastAddress);
        } catch (error) {
          console.warn('[Discovery] UDP setup failed:', error.message);
          clearTimeout(timeout);
          client.close();
          resolve(null);
        }
      });
    });
  }
  
  /**
   * Check if hub is reachable
   */
  async ping(hubUrl) {
    return new Promise((resolve) => {
      try {
        const WebSocket = require('ws');
        const ws = new WebSocket(hubUrl);
        
        const timeout = setTimeout(() => {
          ws.close();
          resolve(false);
        }, 3000);
        
        ws.on('open', () => {
          clearTimeout(timeout);
          ws.send(JSON.stringify({ type: 'ping' }));
        });
        
        ws.on('message', (data) => {
          try {
            const msg = JSON.parse(data);
            if (msg.type === 'pong') {
              ws.close();
              resolve(true);
            }
          } catch (e) {
            // Ignore
          }
        });
        
        ws.on('error', () => {
          clearTimeout(timeout);
          resolve(false);
        });
      } catch (error) {
        resolve(false);
      }
    });
  }
  
  /**
   * Discover with ping verification
   */
  async discoverAndVerify() {
    const hubUrl = await this.discover();
    
    if (hubUrl) {
      const isReachable = await this.ping(hubUrl);
      if (isReachable) {
        return hubUrl;
      }
      console.warn('[Discovery] Hub found but not reachable, using fallback');
    }
    
    return this.fallbackUrl;
  }
}

// CLI mode
if (require.main === module) {
  const client = new DiscoveryClient();
  
  client.discoverAndVerify().then((hubUrl) => {
    console.log(`✨ Hub URL: ${hubUrl}`);
    process.exit(0);
  }).catch((error) => {
    console.error('Discovery failed:', error);
    process.exit(1);
  });
}

module.exports = DiscoveryClient;
