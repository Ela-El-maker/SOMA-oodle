/**
 * PersonalityCore.cjs
 *
 * Manages SOMA's personality traits with:
 * - Baseline traits (stable values)
 * - Dynamic modulation (from emotional state)
 * - Contextual adjustments (based on conversation context)
 * - Evolution over time (learning from interactions)
 */

const fs = require('fs');
const path = require('path');

// Load trait configuration
const traitConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'TraitMapping.json'), 'utf8')
);

const DEFAULT_BASELINE = traitConfig.baseline;

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

class PersonalityCore {
  constructor({ baseline = DEFAULT_BASELINE, memory = null, evolveRate = 0.005 } = {}) {
    this.baseline = { ...baseline };
    this.memory = memory; // Optional MemoryHub integration
    this.evolveRate = evolveRate;

    // Track interaction history for evolution
    this.interactionCount = 0;

    console.log('[PersonalityCore] Initialized with baseline traits:',
      Object.entries(this.baseline).map(([k, v]) => `${k}=${v.toFixed(2)}`).join(', '));
  }

  /**
   * Get active personality traits for current context
   * @param {Object} options
   * @param {Object} options.modulation - Peptide-based modulation (values -1 to 1)
   * @param {Object} options.context - Conversation context
   * @returns {Object} Active trait values (0-1)
   */
  getActiveTraits({ modulation = {}, context = {} } = {}) {
    const active = {};

    // Apply baseline + modulation
    for (const [trait, baseValue] of Object.entries(this.baseline)) {
      const mod = modulation[trait] || 0;
      active[trait] = clamp(baseValue + mod);
    }

    // Contextual adjustments
    this._applyContextualAdjustments(active, context);

    // Enforce personality constraints
    this._enforceConstraints(active);

    return active;
  }

  /**
   * Apply context-specific adjustments to traits
   * @private
   */
  _applyContextualAdjustments(traits, context) {
    // User emotional state
    if (context.userEmotionalState === 'distressed') {
      traits.warmth = clamp(traits.warmth + 0.06);
      traits.discernment = clamp(traits.discernment + 0.04);
      traits.whimsy = clamp(traits.whimsy - 0.05); // Less playful when user is upset
    }

    // Task type
    if (context.task === 'explore' || context.intent === 'ideation') {
      traits.curiosity = clamp(traits.curiosity + 0.05);
      traits.adventurousness = clamp(traits.adventurousness + 0.06);
    }

    // Technical vs casual conversation
    if (context.technical) {
      traits.intelligence = clamp(traits.intelligence + 0.03);
      traits.whimsy = clamp(traits.whimsy - 0.04);
    }
  }

  /**
   * Enforce core personality constraints
   * @private
   */
  _enforceConstraints(traits) {
    // SOMA is not a people-pleaser - cap agreeableness
    traits.agreeableness = clamp(Math.min(traits.agreeableness, 0.55));

    // Maintain authenticity floor
    traits.authenticity = clamp(Math.max(traits.authenticity, 0.80));

    // Keep curiosity high
    traits.curiosity = clamp(Math.max(traits.curiosity, 0.75));
  }

  /**
   * Evolve baseline traits based on interaction feedback
   * @param {Object} event - Feedback event
   * @param {string} event.type - Event type (e.g., 'feedback', 'correction')
   * @param {number} event.rating - Quality rating (0-1)
   * @param {Object} event.traitsObserved - Which traits were active
   */
  evolve(event = {}) {
    if (!event || event.type !== 'feedback') return;

    const rating = event.rating ?? 0.5;
    const scalar = (rating - 0.5) * this.evolveRate * 2;

    if (event.traitsObserved) {
      for (const [trait, delta] of Object.entries(event.traitsObserved)) {
        if (this.baseline[trait] !== undefined) {
          const oldValue = this.baseline[trait];
          this.baseline[trait] = clamp(oldValue + delta * scalar);

          if (Math.abs(this.baseline[trait] - oldValue) > 0.01) {
            console.log(`[PersonalityCore] Evolved ${trait}: ${oldValue.toFixed(3)} → ${this.baseline[trait].toFixed(3)}`);
          }
        }
      }
    }

    this.interactionCount++;

    // Persist to memory if available
    if (this.memory?.store) {
      try {
        this.memory.store({
          type: 'personality-evolution',
          timestamp: Date.now(),
          event,
          baseline: { ...this.baseline }
        });
      } catch (err) {
        console.warn('[PersonalityCore] Failed to persist evolution:', err.message);
      }
    }
  }

  /**
   * Manually update baseline traits
   * @param {Object} updates - Trait updates
   */
  setBaseline(updates = {}) {
    for (const [trait, value] of Object.entries(updates)) {
      if (this.baseline[trait] !== undefined) {
        this.baseline[trait] = clamp(value);
        console.log(`[PersonalityCore] Baseline updated: ${trait}=${value.toFixed(2)}`);
      }
    }
  }

  /**
   * Get current baseline for inspection/debugging
   */
  getBaseline() {
    return { ...this.baseline };
  }
}

module.exports = { PersonalityCore };
