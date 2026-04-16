/**
 * AttentionEngine.cjs - SOMA's Amygdala/Thalamus
 * 
 * Functions as a "Focus Gate" to prevent cognitive overwhelm.
 * Instead of disabling arbiters (neurons), it filters the "volume"
 * of signals reaching the main observation layer.
 */

class AttentionEngine {
  constructor(options = {}) {
    this.name = 'AttentionEngine';
    
    // The "Noise Floor" (0.0 to 1.0)
    // 0.0 = Notice everything (Current State)
    // 1.0 = Total silence (Meditative State)
    this.threshold = options.threshold || 0.2;
    
    // Focal Points: Lobes or Arbiters currently being watched
    this.focusSet = new Set(options.focusSet || []);
    
    // Cooldown Map: Prevents repetitive "Neuron Spikes" from flooding logs
    this.cooldowns = new Map();
    this.cooldownMs = options.cooldownMs || 5000; // 5s suppression for repeated identical signals
    
    // Critical Whitelist: These signals ALWAYS bypass the gate
    this.whitelist = new Set([
      'error',
      'system.panic',
      'security.breach',
      'goal.completed',
      'user.input'
    ]);

    console.log(`[AttentionEngine] 🧠 Focus Gate initialized (Threshold: ${this.threshold})`);
  }

  /**
   * Decides if a signal should be "Noticed" by the system/user.
   * @param {Object} signal - The signal envelope
   * @returns {Boolean}
   */
  shouldNotice(signal) {
    if (!signal) return false;

    // 1. Critical Whitelist (Bypass)
    if (this.whitelist.has(signal.type) || signal.priority === 'critical') {
      return true;
    }

    // 2. Focused Attention (Bypass)
    if (this.focusSet.size > 0) {
      if (this.focusSet.has(signal.from) || this.focusSet.has(signal.lobe)) {
        return true;
      }
    }

    // 3. Spam Suppression (Cooldown)
    const sigKey = `${signal.from}:${signal.type}`;
    const now = Date.now();
    const lastSeen = this.cooldowns.get(sigKey) || 0;
    
    if (now - lastSeen < this.cooldownMs) {
      // Repetitive firing - suppress it to "background noise"
      return false; 
    }
    
    // 4. Threshold Filter (The "Noise Floor")
    const signalStrength = this._calculateSignalStrength(signal);
    if (signalStrength < this.threshold) {
      return false;
    }

    // Signal passed! Update cooldown
    this.cooldowns.set(sigKey, now);
    return true;
  }

  /**
   * Dynamic signal strength calculation
   */
  _calculateSignalStrength(signal) {
    let strength = 0.5; // Neutral baseline

    // Priority multipliers
    if (signal.priority === 'high')   strength += 0.3;
    if (signal.priority === 'low')    strength -= 0.3;
    
    // Specific important types
    if (signal.type?.includes('update'))  strength += 0.1;
    if (signal.type?.includes('heartbeat')) strength -= 0.4; // Heartbeats are background noise

    return Math.max(0, Math.min(1, strength));
  }

  // --- External Controls ---

  setThreshold(val) {
    this.threshold = Math.max(0, Math.min(1, val));
    console.log(`[AttentionEngine] 🎚️ Threshold adjusted: ${this.threshold.toFixed(2)}`);
  }

  addFocus(id) {
    this.focusSet.add(id);
    console.log(`[AttentionEngine] 🔍 Added focus: ${id}`);
  }

  clearFocus() {
    this.focusSet.clear();
    console.log(`[AttentionEngine] 🔭 Focus cleared. Watching whole field.`);
  }
}

module.exports = AttentionEngine;
