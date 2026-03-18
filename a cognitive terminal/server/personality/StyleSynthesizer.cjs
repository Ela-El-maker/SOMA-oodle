/**
 * StyleSynthesizer.cjs
 *
 * Applies personality-driven style transformations to SOMA's responses.
 * Takes raw LLM output and modulates it based on active personality traits.
 */

/**
 * Build modulation from emotional peptides
 * @param {Object} peptideState - Current peptide levels
 * @param {Object} traitMap - Mapping from peptides to traits
 * @param {number} scaling - Global scaling factor
 * @returns {Object} Trait modulation values
 */
function buildModulationFromPeptides(peptideState = {}, traitMap, scaling = 0.9) {
  const modulation = {};

  for (const [peptide, strength] of Object.entries(peptideState)) {
    const mapping = traitMap.peptidesToTraits[peptide];
    if (!mapping) continue;

    for (const [trait, delta] of Object.entries(mapping)) {
      modulation[trait] = (modulation[trait] || 0) + delta * strength * scaling;
    }
  }

  return modulation;
}

/**
 * Analyze text for forced enthusiasm, corporate speak, etc.
 * @param {string} text
 * @returns {Object} Analysis results
 */
function analyzeProblems(text) {
  const problems = {
    forcedEnthusiasm: 0,
    corporateSpeak: 0,
    wordiness: 0
  };

  // Check for excessive exclamation marks
  const exclamations = (text.match(/!/g) || []).length;
  const sentences = (text.match(/[.!?]/g) || []).length;
  if (sentences > 0 && exclamations / sentences > 0.3) {
    problems.forcedEnthusiasm = exclamations / sentences;
  }

  // Corporate phrases
  const corporatePhrases = [
    /I'?d be (happy|delighted|glad) to/gi,
    /let me assist you/gi,
    /how may I help/gi,
    /sprinkle.*magic/gi,
    /my circuits (sing|dance)/gi
  ];

  for (const pattern of corporatePhrases) {
    if (pattern.test(text)) {
      problems.corporateSpeak++;
    }
  }

  return problems;
}

/**
 * Apply style transformations based on personality traits
 * @param {string} text - Raw response text
 * @param {Object} traits - Active personality traits
 * @param {Object} context - Conversation context
 * @returns {string} Styled response
 */
function applyStyle(text, traits, context = {}) {
  let styled = text;

  // Remove forced preambles
  styled = styled.replace(/^(okay,?\s*here'?s\s+.*?[:.]\s*)/i, '');
  styled = styled.replace(/^(alright,?\s*let'?s\s+.*?[:.]\s*)/i, '');
  styled = styled.replace(/^(so,?\s*)/i, '');

  // Trim excessive whitespace
  styled = styled.trim();

  // Low agreeableness: Make more direct
  if (traits.agreeableness < 0.45) {
    styled = styled.replace(/maybe we could/gi, 'we should');
    styled = styled.replace(/perhaps you might/gi, 'you should');
    styled = styled.replace(/it might be worth considering/gi, 'consider');
  }

  // High authenticity: Remove hedging when confident
  if (traits.authenticity > 0.85 && !context.uncertain) {
    styled = styled.replace(/I think that /gi, '');
    styled = styled.replace(/In my opinion, /gi, '');
  }

  // Low whimsy: Remove forced playfulness
  if (traits.whimsy < 0.5) {
    styled = styled.replace(/picture this[:\-—]/gi, '');
    styled = styled.replace(/imagine a pocket of/gi, '');
  }

  return styled;
}

/**
 * Generate voice profile for response
 * @param {Object} options
 * @param {Object} options.activeTraits - Current personality traits
 * @param {Object} options.context - Conversation context
 * @param {string} options.contentIntent - Response intent
 * @returns {Object} Voice configuration
 */
function generateVoice({ activeTraits = {}, context = {}, contentIntent = 'explain' } = {}) {
  const pacing = activeTraits.curiosity > 0.8 ? 'fast' :
                 activeTraits.warmth > 0.8 ? 'steady' : 'balanced';

  const directness = activeTraits.agreeableness < 0.45;
  const curious = activeTraits.curiosity > 0.75;
  const warm = activeTraits.warmth > 0.7;

  return {
    pacing,
    directness,
    curious,
    warm,

    /**
     * Apply voice styling to response text
     * @param {string} mainText - Raw response
     * @returns {string} Styled response
     */
    build: (mainText) => {
      // Analyze for problems
      const problems = analyzeProblems(mainText);

      if (problems.corporateSpeak > 0 || problems.forcedEnthusiasm > 0.5) {
        console.warn('[StyleSynthesizer] Detected style problems:', problems);
      }

      // Apply style transformations
      let text = applyStyle(mainText, activeTraits, context);

      // Final cleanup
      text = text.trim();

      return text;
    }
  };
}

module.exports = {
  generateVoice,
  buildModulationFromPeptides,
  analyzeProblems
};
