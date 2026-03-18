/**
 * PersonalityEngine.cjs
 *
 * Main integration layer that coordinates PersonalityCore and StyleSynthesizer.
 * This is the single entry point for personality-based response processing.
 */

const { PersonalityCore } = require('./PersonalityCore.cjs');
const { generateVoice, buildModulationFromPeptides } = require('./StyleSynthesizer.cjs');
const traitConfig = require('./TraitMapping.json');

class PersonalityEngine {
  constructor({ memory = null } = {}) {
    this.core = new PersonalityCore({ memory });
    this.traitMap = traitConfig;

    console.log('[PersonalityEngine] Initialized');
  }

  /**
   * Process a response through the personality engine
   * @param {string} rawResponse - Raw LLM response
   * @param {Object} options
   * @param {Object} options.peptideState - Current emotional peptides
   * @param {Object} options.context - Conversation context
   * @param {string} options.contentIntent - Response intent
   * @returns {string} Personality-styled response
   */
  processResponse(rawResponse, { peptideState = {}, context = {}, contentIntent = 'explain' } = {}) {
    try {
      let processedResponse = rawResponse;

      // --- Pre-processing: Enforce SOMA's Unified Persona ---
      const brainNames = ['PROMETHEUS', 'LOGOS', 'AURORA', 'THALAMUS', 'TriBrain', 'QuadBrain'];
      const selfReferencePattern = new RegExp(
        `\\b(?:I\\s+go\\s+by|My\\s+designation\\s+is|I\\s+am|I'm)\\s+(?:${brainNames.join('|')})\\b`, 'gi'
      );
      const directBrainNamePattern = new RegExp(`\\b(?:${brainNames.join('|')})\\b`, 'gi');
      
      if (selfReferencePattern.test(processedResponse) || directBrainNamePattern.test(processedResponse)) {
         // Aggressive override for direct identity questions
         if (context?.query && context.query.toLowerCase().includes("what is your name")) {
             processedResponse = "I am SOMA. It's a pleasure to communicate with you.";
         } else {
             // For other cases, replace specific brain names with "SOMA"
             processedResponse = processedResponse.replace(selfReferencePattern, "I am SOMA");
             processedResponse = processedResponse.replace(directBrainNamePattern, "SOMA");
             processedResponse = processedResponse.replace("My designation is SOMA", "I am SOMA");
         }
         console.log('[PersonalityEngine] Filtered out internal brain self-reference to ensure SOMA persona.');
      }
      // --- End Pre-processing ---

      // Build trait modulation from peptides
      const modulation = buildModulationFromPeptides(
        peptideState,
        this.traitMap,
        this.traitMap.scaling
      );

      // Get active personality traits
      const activeTraits = this.core.getActiveTraits({ modulation, context });

      // Generate voice profile
      const voice = generateVoice({ activeTraits, context, contentIntent });

      // Apply personality styling to the (potentially filtered) response
      const styledResponse = voice.build(processedResponse);

      // Log trait activation (debug)
      if (process.env.LOG_LEVEL === 'debug') {
        const topTraits = Object.entries(activeTraits)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([k, v]) => `${k}=${v.toFixed(2)}`)
          .join(', ');

        console.log(`[PersonalityEngine] Active traits: ${topTraits}`);
      }

      return styledResponse;

    } catch (error) {
      console.error('[PersonalityEngine] Error processing response:', error);
      // Fallback: return raw response
      return rawResponse;
    }
  }

  /**
   * Record feedback for personality evolution
   * @param {Object} feedback
   */
  recordFeedback(feedback) {
    this.core.evolve(feedback);
  }

  /**
   * Get current personality state for debugging
   */
  getState() {
    return {
      baseline: this.core.getBaseline(),
      interactionCount: this.core.interactionCount
    };
  }

  /**
   * Update baseline traits
   * @param {Object} updates
   */
  updateBaseline(updates) {
    this.core.setBaseline(updates);
  }
}

// Singleton instance
let instance = null;

/**
 * Get or create personality engine instance
 * @param {Object} options
 * @returns {PersonalityEngine}
 */
function getPersonalityEngine(options = {}) {
  if (!instance) {
    instance = new PersonalityEngine(options);
  }
  return instance;
}

module.exports = {
  PersonalityEngine,
  getPersonalityEngine
};
