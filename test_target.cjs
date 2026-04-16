// A slow, inefficient function for SOMA to optimize
// This represents a "legacy" function that needs modernization
function heavyCalculation(n = 30) { // Default to 30 to ensure measurable work without crashing
  if (n <= 1) return n;
  // Intentionally inefficient recursive implementation O(2^n)
  return heavyCalculation(n - 1) + heavyCalculation(n - 2);
}

module.exports = { heavyCalculation };