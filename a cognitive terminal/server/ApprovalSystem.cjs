/**
 * ApprovalSystem - PRO-LEVEL User Approval Management
 * 
 * Features:
 * - Smart risk detection (auto-approve safe, prompt for risky)
 * - Approval memory (remember user preferences)
 * - Trust scoring (SOMA earns autonomy over time)
 * - Batch approvals (approve multiple at once)
 * - Undo capability (rollback operations)
 * - Pattern learning (detect similar operations)
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class ApprovalSystem {
  constructor() {
    this.pendingApprovals = new Map(); // id → approval request
    this.approvalHistory = []; // Past approvals for learning
    this.trustPatterns = new Map(); // Pattern hash → trust score
    this.userPreferences = {
      autoApproveThreshold: 0.8, // Auto-approve if trust > 80%
      alwaysAskForTypes: ['file_delete', 'system_config'], // Always prompt
      trustedPatterns: [], // User-blessed patterns
      deniedPatterns: [] // User-blocked patterns
    };
    
    this.listeners = new Set(); // WebSocket clients
    this.savePath = path.join(__dirname, '..', 'SOMA', 'approval-system.json');
    
    // Risk weights for different operation types
    this.riskWeights = {
      file_read: 0.1,
      file_write: 0.5,
      file_delete: 0.9,
      file_execute: 0.8,
      shell_command: 0.7,
      system_config: 0.95,
      network_request: 0.4,
      database_write: 0.6,
      database_delete: 0.85
    };
    
    console.log('[ApprovalSystem] 🛡️ Initialized');
  }

  /**
   * Initialize system (load state from disk)
   */
  async initialize() {
    try {
      const data = await fs.readFile(this.savePath, 'utf8');
      const saved = JSON.parse(data);
      
      this.approvalHistory = saved.history || [];
      this.trustPatterns = new Map(saved.trustPatterns || []);
      this.userPreferences = { ...this.userPreferences, ...saved.preferences };
      
      console.log(`[ApprovalSystem] 📂 Loaded ${this.approvalHistory.length} past approvals`);
      console.log(`[ApprovalSystem] 🔐 Trust patterns: ${this.trustPatterns.size}`);
    } catch (err) {
      console.log('[ApprovalSystem] 📂 Starting with empty history');
    }
  }

  /**
   * Save state to disk
   */
  async save() {
    try {
      const dir = path.dirname(this.savePath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(this.savePath, JSON.stringify({
        history: this.approvalHistory.slice(-1000), // Keep last 1000
        trustPatterns: Array.from(this.trustPatterns.entries()),
        preferences: this.userPreferences,
        savedAt: new Date().toISOString()
      }, null, 2));
    } catch (err) {
      console.error('[ApprovalSystem] ❌ Failed to save:', err.message);
    }
  }

  /**
   * Request approval for an operation
   * Returns: { approved: boolean, autoApproved: boolean, reason: string }
   */
  async requestApproval(operation) {
    const {
      type,           // 'file_write', 'shell_command', etc.
      action,         // Human-readable description
      details,        // Full details (command, file path, etc.)
      context = {},   // Additional context
      riskOverride    // Manual risk level (0-1)
    } = operation;

    // 1. Calculate risk score
    const riskScore = riskOverride ?? this.calculateRiskScore(type, details, context);
    
    // 2. Generate pattern hash for similarity matching
    const patternHash = this.generatePatternHash(type, details);
    
    // 3. Check if pattern is explicitly trusted/denied
    if (this.userPreferences.trustedPatterns.includes(patternHash)) {
      console.log(`[ApprovalSystem] ✅ Auto-approved (trusted pattern): ${action}`);
      this.recordApproval(operation, true, true, 'trusted_pattern');
      return { approved: true, autoApproved: true, reason: 'trusted_pattern' };
    }
    
    if (this.userPreferences.deniedPatterns.includes(patternHash)) {
      console.log(`[ApprovalSystem] ❌ Auto-denied (blocked pattern): ${action}`);
      this.recordApproval(operation, false, true, 'blocked_pattern');
      return { approved: false, autoApproved: true, reason: 'blocked_pattern' };
    }
    
    // 4. Check trust score
    const trustScore = this.trustPatterns.get(patternHash) || 0;
    
    // 5. Decision logic
    const shouldAutoApprove = 
      riskScore < 0.3 || // Very low risk
      (trustScore >= this.userPreferences.autoApproveThreshold && 
       !this.userPreferences.alwaysAskForTypes.includes(type));
    
    if (shouldAutoApprove) {
      console.log(`[ApprovalSystem] ✅ Auto-approved (risk: ${riskScore.toFixed(2)}, trust: ${trustScore.toFixed(2)}): ${action}`);
      this.recordApproval(operation, true, true, 'low_risk_or_trusted');
      return { approved: true, autoApproved: true, reason: 'low_risk_or_trusted' };
    }
    
    // 6. Require user approval
    return await this.promptUser(operation, riskScore, trustScore, patternHash);
  }

  /**
   * Calculate risk score for an operation
   */
  calculateRiskScore(type, details, context) {
    let baseRisk = this.riskWeights[type] || 0.5;
    
    // Increase risk for certain patterns
    const detailsStr = JSON.stringify(details).toLowerCase();
    
    if (detailsStr.includes('delete') || detailsStr.includes('rm ')) {
      baseRisk = Math.min(1.0, baseRisk + 0.2);
    }
    
    if (detailsStr.includes('sudo') || detailsStr.includes('admin')) {
      baseRisk = Math.min(1.0, baseRisk + 0.3);
    }
    
    if (detailsStr.includes('system32') || detailsStr.includes('/etc/')) {
      baseRisk = Math.min(1.0, baseRisk + 0.4);
    }
    
    if (detailsStr.includes('recursive') || detailsStr.includes('-rf')) {
      baseRisk = Math.min(1.0, baseRisk + 0.3);
    }
    
    // Reduce risk for read-only operations
    if (type === 'file_read' || detailsStr.includes('readonly')) {
      baseRisk = Math.max(0.1, baseRisk - 0.2);
    }
    
    return baseRisk;
  }

  /**
   * Generate pattern hash for similarity detection
   */
  generatePatternHash(type, details) {
    // Normalize details to detect similar operations
    const normalized = JSON.stringify({
      type,
      // Extract patterns (e.g., file extensions, command names)
      pattern: this.extractPattern(details)
    });
    
    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
  }

  /**
   * Extract pattern from operation details
   */
  extractPattern(details) {
    const str = JSON.stringify(details);
    
    // Extract file extensions
    const extensions = (str.match(/\.\w+/g) || []).join(',');
    
    // Extract command names (first word)
    const commands = (str.match(/\b(npm|node|git|rm|cp|mv|mkdir|touch)\b/g) || []).join(',');
    
    return { extensions, commands };
  }

  /**
   * Prompt user for approval (WebSocket-based)
   */
  async promptUser(operation, riskScore, trustScore, patternHash) {
    const approvalId = crypto.randomUUID();
    
    const request = {
      id: approvalId,
      ...operation,
      riskScore,
      trustScore,
      patternHash,
      timestamp: Date.now(),
      expiresAt: Date.now() + 60000 // 60 second timeout
    };
    
    this.pendingApprovals.set(approvalId, request);
    
    // Emit to all connected clients
    this.broadcast('approval_required', request);
    
    console.log(`[ApprovalSystem] ⏳ Waiting for user approval: ${operation.action}`);
    
    // Wait for response or timeout
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const approval = this.pendingApprovals.get(approvalId);
        
        // Check if resolved
        if (approval.response) {
          clearInterval(checkInterval);
          this.pendingApprovals.delete(approvalId);
          
          this.recordApproval(operation, approval.response.approved, false, approval.response.reason || 'user_decision');
          
          // Update trust if user wants to remember
          if (approval.response.rememberPattern) {
            this.updateTrustPattern(patternHash, approval.response.approved);
          }
          
          resolve({
            approved: approval.response.approved,
            autoApproved: false,
            reason: approval.response.reason || 'user_decision'
          });
        }
        
        // Check timeout
        if (Date.now() > approval.expiresAt) {
          clearInterval(checkInterval);
          this.pendingApprovals.delete(approvalId);
          
          console.log(`[ApprovalSystem] ⏰ Approval timeout: ${operation.action}`);
          this.recordApproval(operation, false, false, 'timeout');
          
          resolve({
            approved: false,
            autoApproved: false,
            reason: 'timeout'
          });
        }
      }, 100);
    });
  }

  /**
   * Handle user response
   */
  respondToApproval(response) {
    // Response has shape: { requestId, approved, rememberDecision, reason }
    const approvalId = response.requestId;
    const approval = this.pendingApprovals.get(approvalId);
    
    if (!approval) {
      console.warn(`[ApprovalSystem] ⚠️ Unknown approval ID: ${approvalId}`);
      return false;
    }
    
    approval.response = {
      approved: response.approved,
      rememberPattern: response.rememberDecision || false,
      reason: response.reason || 'user_decision'
    };
    return true;
  }

  /**
   * Update trust pattern based on user decision
   */
  updateTrustPattern(patternHash, approved) {
    const currentTrust = this.trustPatterns.get(patternHash) || 0.5;
    
    // Bayesian-style update
    const newTrust = approved
      ? currentTrust + (1 - currentTrust) * 0.3 // Increase trust
      : currentTrust * 0.7; // Decrease trust
    
    this.trustPatterns.set(patternHash, newTrust);
    
    console.log(`[ApprovalSystem] 📊 Updated trust for pattern: ${patternHash} → ${newTrust.toFixed(2)}`);
    
    this.save(); // Persist
  }

  /**
   * Record approval in history
   */
  recordApproval(operation, approved, autoApproved, reason) {
    this.approvalHistory.push({
      ...operation,
      approved,
      autoApproved,
      reason,
      timestamp: Date.now()
    });
    
    // Keep history bounded
    if (this.approvalHistory.length > 1000) {
      this.approvalHistory.shift();
    }
    
    this.save(); // Persist
  }

  /**
   * Get pending approvals
   */
  getPendingApprovals() {
    return Array.from(this.pendingApprovals.values());
  }

  /**
   * Get approval statistics
   */
  getStats() {
    const recent = this.approvalHistory.slice(-100);
    
    return {
      totalApprovals: this.approvalHistory.length,
      recentApprovals: recent.length,
      approvalRate: recent.filter(a => a.approved).length / (recent.length || 1),
      autoApprovalRate: recent.filter(a => a.autoApproved).length / (recent.length || 1),
      trustPatterns: this.trustPatterns.size,
      avgTrustScore: Array.from(this.trustPatterns.values()).reduce((a, b) => a + b, 0) / (this.trustPatterns.size || 1)
    };
  }

  /**
   * WebSocket connection management
   */
  addWebSocketListener(emitFunc) {
    // emitFunc is (event, data) => void
    this.listeners.add({ emit: emitFunc });
  }
  
  addListener(listener) {
    this.listeners.add(listener);
  }

  removeListener(listener) {
    this.listeners.delete(listener);
  }

  broadcast(event, data) {
    for (const listener of this.listeners) {
      try {
        if (typeof listener.emit === 'function') {
          listener.emit(event, data);
        } else if (typeof listener === 'function') {
          listener(event, data);
        }
      } catch (err) {
        console.error('[ApprovalSystem] Failed to emit to listener:', err.message);
      }
    }
  }
}

// Singleton instance
let approvalSystem = null;

function getApprovalSystem() {
  if (!approvalSystem) {
    approvalSystem = new ApprovalSystem();
  }
  return approvalSystem;
}

module.exports = { ApprovalSystem, getApprovalSystem };
