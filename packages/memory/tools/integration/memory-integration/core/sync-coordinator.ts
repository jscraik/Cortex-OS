/**
 * Cross-Library Synchronization Coordinator
 * @split_from advanced-memory-setup-phase6.ts
 * 
 * This module handles data consistency and conflict resolution across
 * the unified memory system, coordinating synchronization between libraries.
 */

import { UnifiedMemoryManager } from './unified-memory-manager';
import { SyncRule, UnifiedMemoryConfig } from '../types/index';

export class SyncCoordinator {
  private manager: UnifiedMemoryManager;
  private syncRules: SyncRule[] = [];
  private isRunning = false;
  private syncInterval: NodeJS.Timeout | null = null;
  
  constructor(manager: UnifiedMemoryManager) {
    this.manager = manager;
    this.initializeDefaultRules();
  }
  
  private initializeDefaultRules(): void {
    this.syncRules = [
      {
        id: 'mem0_to_letta',
        sourceLibrary: 'mem0',
        targetLibrary: 'letta',
        dataType: 'memories',
        frequency: 'scheduled',
        conflictResolution: 'latest_wins',
        enabled: true,
      },
      {
        id: 'graphiti_to_letta',
        sourceLibrary: 'graphiti',
        targetLibrary: 'letta',
        dataType: 'entities',
        frequency: 'scheduled',
        conflictResolution: 'merge',
        enabled: true,
      },
      {
        id: 'letta_to_mem0',
        sourceLibrary: 'letta',
        targetLibrary: 'mem0',
        dataType: 'new_memories',
        frequency: 'realtime',
        conflictResolution: 'latest_wins',
        enabled: true,
      },
    ];
  }
  
  /**
   * Start scheduled synchronization based on configuration
   */
  async startScheduledSync(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Sync coordinator already running');
      return;
    }
    
    this.isRunning = true;
    console.log('🔄 Starting scheduled synchronization...');
    
    const config = this.manager.getConfig();
    const intervalMs = config.synchronization.sync_interval_minutes * 60 * 1000;
    
    this.syncInterval = setInterval(async () => {
      try {
        await this.performScheduledSync();
      } catch (error) {
        console.error('Scheduled sync failed:', error);
        this.handleSyncError(error);
      }
    }, intervalMs);
    
    console.log(`✅ Sync coordinator started with ${config.synchronization.sync_interval_minutes} minute intervals`);
  }
  
  /**
   * Stop scheduled synchronization
   */
  stopScheduledSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    this.isRunning = false;
    console.log('⏹️ Stopped scheduled synchronization');
  }
  
  /**
   * Perform synchronization based on active sync rules
   */
  private async performScheduledSync(): Promise<void> {
    console.log('🔄 Executing scheduled synchronization...');
    
    const activeRules = this.syncRules.filter(rule => rule.enabled && rule.frequency === 'scheduled');
    
    if (activeRules.length === 0) {
      console.log('⏭️ No active sync rules found');
      return;
    }
    
    try {
      const syncResults = await this.manager.performFullSync();
      console.log(`✅ Scheduled sync completed: ${syncResults.length} operations`);
      
      // Log sync results summary
      const completed = syncResults.filter(op => op.status === 'completed').length;
      const failed = syncResults.filter(op => op.status === 'failed').length;
      
      console.log(`   - Completed: ${completed}, Failed: ${failed}`);
      
      if (failed > 0) {
        console.warn(`⚠️ ${failed} sync operations failed during scheduled sync`);
      }
      
    } catch (error) {
      console.error('❌ Scheduled sync operation failed:', error);
      throw error;
    }
  }
  
  /**
   * Add a new sync rule
   */
  addSyncRule(rule: SyncRule): void {
    // Check if rule with same ID already exists
    const existingIndex = this.syncRules.findIndex(r => r.id === rule.id);
    
    if (existingIndex >= 0) {
      this.syncRules[existingIndex] = rule;
      console.log(`🔄 Updated sync rule: ${rule.id}`);
    } else {
      this.syncRules.push(rule);
      console.log(`➕ Added new sync rule: ${rule.id}`);
    }
  }
  
  /**
   * Remove a sync rule by ID
   */
  removeSyncRule(ruleId: string): boolean {
    const initialLength = this.syncRules.length;
    this.syncRules = this.syncRules.filter(rule => rule.id !== ruleId);
    
    const removed = this.syncRules.length < initialLength;
    if (removed) {
      console.log(`➖ Removed sync rule: ${ruleId}`);
    } else {
      console.warn(`⚠️ Sync rule not found: ${ruleId}`);
    }
    
    return removed;
  }
  
  /**
   * Enable or disable a sync rule
   */
  toggleSyncRule(ruleId: string, enabled: boolean): boolean {
    const rule = this.syncRules.find(r => r.id === ruleId);
    
    if (rule) {
      rule.enabled = enabled;
      console.log(`🔧 ${enabled ? 'Enabled' : 'Disabled'} sync rule: ${ruleId}`);
      return true;
    } else {
      console.warn(`⚠️ Sync rule not found: ${ruleId}`);
      return false;
    }
  }
  
  /**
   * Get all sync rules
   */
  getSyncRules(): SyncRule[] {
    return [...this.syncRules];
  }
  
  /**
   * Get active sync rules only
   */
  getActiveSyncRules(): SyncRule[] {
    return this.syncRules.filter(rule => rule.enabled);
  }
  
  /**
   * Validate sync rule configuration
   */
  private validateSyncRule(rule: SyncRule): string[] {
    const errors: string[] = [];
    
    if (!rule.id || rule.id.trim() === '') {
      errors.push('Rule ID is required');
    }
    
    if (!rule.sourceLibrary || !rule.targetLibrary) {
      errors.push('Source and target libraries are required');
    }
    
    if (rule.sourceLibrary === rule.targetLibrary) {
      errors.push('Source and target libraries cannot be the same');
    }
    
    const validLibraries = ['mem0', 'graphiti', 'letta'];
    if (!validLibraries.includes(rule.sourceLibrary)) {
      errors.push(`Invalid source library: ${rule.sourceLibrary}`);
    }
    
    if (!validLibraries.includes(rule.targetLibrary)) {
      errors.push(`Invalid target library: ${rule.targetLibrary}`);
    }
    
    const validFrequencies = ['realtime', 'scheduled', 'manual'];
    if (!validFrequencies.includes(rule.frequency)) {
      errors.push(`Invalid frequency: ${rule.frequency}`);
    }
    
    const validResolutions = ['latest_wins', 'merge', 'manual_review'];
    if (!validResolutions.includes(rule.conflictResolution)) {
      errors.push(`Invalid conflict resolution: ${rule.conflictResolution}`);
    }
    
    return errors;
  }
  
  /**
   * Handle synchronization errors
   */
  private handleSyncError(error: any): void {
    console.error('🚨 Sync coordinator error:', error);
    
    // In a production system, this would:
    // 1. Log to error monitoring system
    // 2. Send alerts to administrators
    // 3. Possibly disable problematic sync rules
    // 4. Attempt recovery procedures
    
    // For now, just log the error details
    if (error instanceof Error) {
      console.error(`   Error name: ${error.name}`);
      console.error(`   Error message: ${error.message}`);
      console.error(`   Stack trace: ${error.stack}`);
    }
  }
  
  /**
   * Get synchronization status
   */
  getSyncStatus(): {
    isRunning: boolean;
    activeRulesCount: number;
    totalRulesCount: number;
    lastSyncAttempt?: string;
  } {
    return {
      isRunning: this.isRunning,
      activeRulesCount: this.getActiveSyncRules().length,
      totalRulesCount: this.syncRules.length,
      lastSyncAttempt: new Date().toISOString(), // Would track actual last attempt
    };
  }
  
  /**
   * Force immediate synchronization (manual trigger)
   */
  async forceSyncNow(): Promise<void> {
    console.log('🚀 Force triggering immediate synchronization...');
    
    try {
      await this.performScheduledSync();
      console.log('✅ Force sync completed successfully');
    } catch (error) {
      console.error('❌ Force sync failed:', error);
      throw error;
    }
  }
  
  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up sync coordinator...');
    
    this.stopScheduledSync();
    this.syncRules = [];
    
    console.log('✅ Sync coordinator cleanup completed');
  }
}