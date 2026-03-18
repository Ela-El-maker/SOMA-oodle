/**
 * core/CapabilityRegistry.js
 * 
 * Central registry for SOMA's discovered and registered capabilities.
 */

export class CapabilityRegistry {
    constructor() {
        this.capabilities = new Map();
    }

    /**
     * Register a new capability
     * @param {string} name 
     * @param {Object} capability 
     */
    register(name, capability) {
        this.capabilities.set(name, {
            ...capability,
            registeredAt: Date.now()
        });
        console.log(`[CapabilityRegistry] Registered: ${name}`);
    }

    /**
     * Get a registered capability
     * @param {string} name 
     */
    get(name) {
        return this.capabilities.get(name);
    }

    /**
     * List all capabilities
     */
    list() {
        return Array.from(this.capabilities.keys());
    }

    /**
     * Search for capabilities matching a keyword
     */
    search(query) {
        const results = [];
        const q = query.toLowerCase();
        for (const [name, cap] of this.capabilities) {
            if (name.toLowerCase().includes(q) || 
                (cap.description && cap.description.toLowerCase().includes(q))) {
                results.push({ name, ...cap });
            }
        }
        return results;
    }
}

export default new CapabilityRegistry();
