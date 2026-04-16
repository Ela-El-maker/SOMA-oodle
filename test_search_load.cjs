
try {
    console.log("Loading HybridSearchArbiter...");
    const HybridSearch = require('./arbiters/HybridSearchArbiter.cjs');
    console.log("Loaded successfully.");
} catch (e) {
    console.error("Failed to load:", e);
}
