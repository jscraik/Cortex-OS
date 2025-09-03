'use client';

import React from 'react';
import Collapsible from './Collapsible';

interface Valve {
  id: string;
  name: string;
  type: 'boolean' | 'number' | 'string' | 'select';
  value: any;
  description?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
}

interface ValvesProps {
  valves: Valve[];
  onChange: (valves: Valve[]) => void;
  className?: string;
}

const Valves: React.FC<ValvesProps> = ({ valves, onChange, className = '' }) => {
  const handleValveChange = (id: string, value: any) => {
    const updatedValves = valves.map((valve) => (valve.id === id ? { ...valve, value } : valve));
    onChange(updatedValves);
  };

  const renderValveInput = (valve: Valve) => {
    switch (valve.type) {
      case 'boolean':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={valve.value}
              onChange={(e) => handleValveChange(valve.id, e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">{valve.description}</span>
          </div>
        );
      case 'number':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{valve.name}</label>
            <input
              type="number"
              value={valve.value}
              onChange={(e) => handleValveChange(valve.id, parseFloat(e.target.value))}
              min={valve.min}
              max={valve.max}
              step={valve.step}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {valve.description && <p className="mt-1 text-xs text-gray-500">{valve.description}</p>}
          </div>
        );
      case 'string':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{valve.name}</label>
            <input
              type="text"
              value={valve.value}
              onChange={(e) => handleValveChange(valve.id, e.target.value)}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {valve.description && <p className="mt-1 text-xs text-gray-500">{valve.description}</p>}
          </div>
        );
      case 'select':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{valve.name}</label>
            <select
              value={valve.value}
              onChange={(e) => handleValveChange(valve.id, e.target.value)}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {valve.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {valve.description && <p className="mt-1 text-xs text-gray-500">{valve.description}</p>}
          </div>
        );
      default:
        return null;
    }
  };

  // Group valves by category (if any)
  const groupedValves: { [key: string]: Valve[] } = {};
  valves.forEach((valve) => {
    const category = valve.name.split('.')[0] || 'General';
    if (!groupedValves[category]) {
      groupedValves[category] = [];
    }
    groupedValves[category].push(valve);
  });

  const categories = Object.keys(groupedValves);

  return (
    <div className={className}>
      {categories.length > 1 ? (
        categories.map((category) => (
          <Collapsible key={category} title={category} defaultOpen={false}>
            <div className="space-y-4">
              {groupedValves[category].map((valve) => (
                <div key={valve.id}>{renderValveInput(valve)}</div>
              ))}
            </div>
          </Collapsible>
        ))
      ) : (
        <div className="space-y-4">
          {valves.map((valve) => (
            <div key={valve.id}>{renderValveInput(valve)}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Valves;
