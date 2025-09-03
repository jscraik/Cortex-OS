'use client';

import React from 'react';
import Node from './Node';

interface FlowProps {
  nodes: any[];
  connections: any[];
  onNodeSelect: (nodeId: string) => void;
}

const Flow: React.FC<FlowProps> = ({ nodes, connections, onNodeSelect }) => {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0 bg-gray-50">
        {/* Render connections/edges */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {connections.map((connection, index) => (
            <line
              key={index}
              x1={connection.sourceX}
              y1={connection.sourceY}
              x2={connection.targetX}
              y2={connection.targetY}
              stroke="#94a3b8"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
          ))}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
            </marker>
          </defs>
        </svg>

        {/* Render nodes */}
        {nodes.map((node) => (
          <Node key={node.id} node={node} onSelect={onNodeSelect} />
        ))}
      </div>
    </div>
  );
};

export default Flow;
