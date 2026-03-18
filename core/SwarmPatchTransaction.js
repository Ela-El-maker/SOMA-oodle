/**
 * core/SwarmPatchTransaction.js
 * 
 * Multi-file patch transaction system for SOMA.
 * Allows safe multi-file edits with atomic-like rollback protection.
 */

import fs from 'fs/promises';
import path from 'path';

export class SwarmPatchTransaction {
    constructor(rootPath) {
        this.rootPath = rootPath || process.cwd();
        this.backups = [];
        this.applied = false;
    }

    /**
     * Apply a patch containing multiple file changes.
     * @param {Object} patch { files: [{ path: string, content: string }] }
     */
    async applyPatch(patch) {
        if (!patch || !Array.isArray(patch.files)) {
            throw new Error("Invalid patch format: expected { files: [...] }");
        }

        this.backups = [];
        const filesToPatch = [];

        try {
            // 1. Prepare and Backup
            for (const file of patch.files) {
                const fullPath = path.isAbsolute(file.path) 
                    ? file.path 
                    : path.resolve(this.rootPath, file.path);
                
                // Security check: ensure path is within rootPath
                if (!fullPath.startsWith(path.resolve(this.rootPath))) {
                    throw new Error(`Security violation: Patch path outside root: ${file.path}`);
                }

                let original = null;
                try {
                    original = await fs.readFile(fullPath, 'utf8');
                } catch (e) {
                    // File might be new, that's okay
                }

                this.backups.push({
                    path: fullPath,
                    content: original,
                    isNew: original === null
                });

                filesToPatch.push({
                    path: fullPath,
                    content: file.content
                });
            }

            // 2. Execute Write
            for (const file of filesToPatch) {
                // Ensure directory exists
                await fs.mkdir(path.dirname(file.path), { recursive: true });
                await fs.writeFile(file.path, file.content, 'utf8');
            }

            this.applied = true;
            return { success: true, count: filesToPatch.length };

        } catch (err) {
            // Automatic rollback on failure during application
            await this.rollback();
            throw err;
        }
    }

    /**
     * Roll back all changes made in this transaction.
     */
    async rollback() {
        console.log(`[SwarmTransaction] 🔄 Rolling back ${this.backups.length} changes...`);
        for (const backup of this.backups) {
            try {
                if (backup.isNew) {
                    // Delete the file if it was newly created
                    await fs.unlink(backup.path);
                } else {
                    // Restore original content
                    await fs.writeFile(backup.path, backup.content, 'utf8');
                }
            } catch (e) {
                console.error(`[SwarmTransaction] Failed to rollback ${backup.path}: ${e.message}`);
            }
        }
        this.applied = false;
    }

    /**
     * Commit the transaction (finalize).
     * In this implementation, it mostly just clears the backups.
     */
    commit() {
        this.backups = [];
        this.applied = false;
    }
}
