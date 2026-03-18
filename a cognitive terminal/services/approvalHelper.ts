/**
 * ApprovalHelper
 * 
 * Example wrapper for requesting user approval for risky operations.
 * This demonstrates how to integrate the ApprovalSystem into SOMA operations.
 * 
 * Usage:
 * ```ts
 * import { requestApproval } from './approvalHelper';
 * 
 * const approved = await requestApproval({
 *   type: 'file_delete',
 *   target: '/important/file.txt',
 *   description: 'Delete configuration file',
 *   metadata: { size: 1024, modifiedAt: Date.now() }
 * });
 * 
 * if (approved) {
 *   // Perform the risky operation
 * }
 * ```
 */

export interface ApprovalRequest {
  type: string;
  target: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface ApprovalResponse {
  requestId: string;
  approved: boolean;
  rememberDecision: boolean;
}

/**
 * Request user approval for a risky operation
 * @param request The approval request details
 * @returns Promise that resolves to true if approved, false if denied
 */
export async function requestApproval(request: ApprovalRequest): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:3001/api/approval/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      console.error('[ApprovalHelper] Request failed:', response.statusText);
      return false; // Default to deny if request fails
    }
    
    const result: ApprovalResponse = await response.json();
    return result.approved;
  } catch (error) {
    console.error('[ApprovalHelper] Error requesting approval:', error);
    return false; // Default to deny on error
  }
}

/**
 * Example: Wrap a file deletion operation with approval
 */
export async function safeDeleteFile(filepath: string): Promise<{ success: boolean; message: string }> {
  // Request approval first
  const approved = await requestApproval({
    type: 'file_delete',
    target: filepath,
    description: `Delete file: ${filepath}`,
    metadata: { 
      timestamp: Date.now(),
      source: 'somaService'
    }
  });
  
  if (!approved) {
    return { 
      success: false, 
      message: 'User denied permission to delete file' 
    };
  }
  
  // If approved, perform the deletion
  try {
    const response = await fetch('http://localhost:3001/api/file/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filepath })
    });
    
    if (response.ok) {
      return { 
        success: true, 
        message: `Deleted: ${filepath}` 
      };
    } else {
      return { 
        success: false, 
        message: `Failed to delete: ${response.statusText}` 
      };
    }
  } catch (error: any) {
    return { 
      success: false, 
      message: `Error: ${error.message}` 
    };
  }
}

/**
 * Example: Wrap a shell command execution with approval
 */
export async function safeRunCommand(command: string): Promise<{ success: boolean; output?: string; message: string }> {
  // Determine if command is risky
  const riskyPatterns = ['rm', 'del', 'sudo', 'format', 'dd', 'mkfs'];
  const isRisky = riskyPatterns.some(pattern => command.toLowerCase().includes(pattern));
  
  if (isRisky) {
    const approved = await requestApproval({
      type: 'shell_command',
      target: command,
      description: `Execute potentially dangerous command: ${command}`,
      metadata: { 
        timestamp: Date.now(),
        riskLevel: 'high'
      }
    });
    
    if (!approved) {
      return { 
        success: false, 
        message: 'User denied permission to execute command' 
      };
    }
  }
  
  // Execute the command
  try {
    const response = await fetch('http://localhost:3001/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });
    
    if (response.ok) {
      const result = await response.json();
      return { 
        success: true, 
        output: result.output,
        message: 'Command executed successfully' 
      };
    } else {
      return { 
        success: false, 
        message: `Failed to execute: ${response.statusText}` 
      };
    }
  } catch (error: any) {
    return { 
      success: false, 
      message: `Error: ${error.message}` 
    };
  }
}

/**
 * Example: Wrap a file write operation with approval for system files
 */
export async function safeWriteFile(filepath: string, content: string): Promise<{ success: boolean; message: string }> {
  // Check if writing to a system or config file
  const systemPaths = ['/etc/', 'C:\\Windows\\', '/System/', '.config'];
  const isSystemFile = systemPaths.some(sysPath => filepath.includes(sysPath));
  
  if (isSystemFile) {
    const approved = await requestApproval({
      type: 'file_write',
      target: filepath,
      description: `Write to system file: ${filepath}`,
      metadata: { 
        timestamp: Date.now(),
        contentSize: content.length,
        isSystemFile: true
      }
    });
    
    if (!approved) {
      return { 
        success: false, 
        message: 'User denied permission to write to system file' 
      };
    }
  }
  
  // Perform the write
  try {
    const response = await fetch('http://localhost:3001/api/file/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filepath, content })
    });
    
    if (response.ok) {
      return { 
        success: true, 
        message: `Wrote to: ${filepath}` 
      };
    } else {
      return { 
        success: false, 
        message: `Failed to write: ${response.statusText}` 
      };
    }
  } catch (error: any) {
    return { 
      success: false, 
      message: `Error: ${error.message}` 
    };
  }
}
