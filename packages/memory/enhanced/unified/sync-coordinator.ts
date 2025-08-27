/**
 * Cross-Library Synchronization Coordinator
 * Handles data consistency and conflict resolution
 */

import { UnifiedMemoryManager } from './unified-memory-manager';

export interface SyncRule {
  id: string;
  sourceLibrary: string;
  targetLibrary: string;
  dataType: string;
  frequency: 'realtime' | 'scheduled' | 'manual';
  conflictResolution: 'latest_wins' | 'merge' | 'manual_review';
  enabled: boolean;
}

export class SyncCoordinator {
  private manager: UnifiedMemoryManager;
  private syncRules: SyncRule[] = [];
  private isRunning = false;

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

  async startScheduledSync(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('🔄 Starting scheduled synchronization...');

    setInterval(
      async () => {
        try {
          await this.manager.performFullSync();
        } catch (error) {
          console.error('Scheduled sync failed:', error);
        }
      },
      15 * 60 * 1000,
    );
  }

  stopScheduledSync(): void {
    this.isRunning = false;
    console.log('⏹️ Stopped scheduled synchronization');
  }
}
