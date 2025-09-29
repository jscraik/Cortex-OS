export interface PoolMemberState {
  id: string;
  running: number;
  queued: number;
  capacity: number;
}

export interface PoolHealthSummary {
  members: PoolMemberState[];
  totalRunning: number;
  totalQueued: number;
  totalCapacity: number;
  utilisation: number;
}

export function calculatePoolHealth(members: PoolMemberState[]): PoolHealthSummary {
  if (members.length === 0) {
    return {
      members: [],
      totalRunning: 0,
      totalQueued: 0,
      totalCapacity: 0,
      utilisation: 0,
    };
  }

  const totals = members.reduce(
    (acc, member) => {
      if (member.capacity < 0 || member.running < 0 || member.queued < 0) {
        throw new Error("brAInwav pool metrics must be non-negative");
      }

      return {
        running: acc.running + member.running,
        queued: acc.queued + member.queued,
        capacity: acc.capacity + member.capacity,
      };
    },
    { running: 0, queued: 0, capacity: 0 },
  );

  const utilisation = totals.capacity === 0 ? 0 : totals.running / totals.capacity;

  return {
    members: members.map((member) => ({ ...member })),
    totalRunning: totals.running,
    totalQueued: totals.queued,
    totalCapacity: totals.capacity,
    utilisation,
  };
}
