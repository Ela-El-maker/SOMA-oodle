
import { Bonjour } from 'bonjour-service';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const messageBroker = require('../MessageBroker.cjs');

/**
 * HERMES DISCOVERY — PROJECT HERMES V2
 * v0.1 — mDNS-based Auto-Discovery for Omnipresent SOMA
 * 
 * Protocol: POSEIDON
 * Purpose: Allows SOMA instances to find and link with each other automatically.
 */
export class HermesDiscovery {
    constructor(config = {}) {
        this.bonjour = new Bonjour();
        this.name = config.name || `SOMA-${Math.random().toString(36).substring(2, 7)}`;
        this.port = config.port || 4201;
        this.serviceType = 'soma';
        this.nodes = new Map(); // name -> service
    }

    /**
     * Start broadcasting this node's presence
     */
    startBeacon() {
        console.log(`[Hermes] 📡 Starting Beacon: ${this.name} on port ${this.port}`);
        this.bonjour.publish({
            name: this.name,
            type: this.serviceType,
            port: this.port,
            txt: { version: '1.0.0', protocol: 'poseidon' }
        });
    }

    /**
     * Start searching for other SOMA nodes
     */
    startSeeker() {
        console.log(`[Hermes] 🔍 Seeker active. Looking for other SOMA nodes...`);
        const browser = this.bonjour.find({ type: this.serviceType });

        browser.on('up', (service) => {
            if (service.name === this.name) return; // Ignore self
            
            console.log(`[Hermes] ✨ Node Found: ${service.name} at ${service.referer.address}:${service.port}`);
            this.nodes.set(service.name, service);
            
            // Auto-link via MessageBroker network bridge logic
            // In a full implementation, we'd initiate a WebSocket connection here
            // messageBroker.connectToRemoteNode(service.referer.address, service.port);
        });

        browser.on('down', (service) => {
            console.log(`[Hermes] 🌑 Node Offline: ${service.name}`);
            this.nodes.delete(service.name);
        });
    }

    stop() {
        this.bonjour.destroy();
    }
}
