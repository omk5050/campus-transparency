import React from 'react';

export interface FilterOptions {
  status: string;
  horizon: string;
}

interface FilterBarProps {
  filters: FilterOptions;
  onChange: (filters: FilterOptions) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, onChange }) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-[#1A1F26] rounded-md border border-white/5 justify-center items-center">
      <div className="flex flex-col min-w-[150px]">
        <label className="text-xs font-mono text-white/50 mb-1">Lifecycle Status</label>
        <select 
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
          className="bg-[#0B0F14] border border-white/10 text-white text-sm rounded px-3 py-2 outline-none focus:border-[#00E5FF] transition-colors appearance-none cursor-pointer hover:border-white/20"
        >
          <option value="ALL">All Statuses</option>
          <option value="REPORTED">Reported</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="flex flex-col min-w-[150px]">
        <label className="text-xs font-mono text-white/50 mb-1">Time Horizon</label>
        <select 
          value={filters.horizon}
          onChange={(e) => onChange({ ...filters, horizon: e.target.value })}
          className="bg-[#0B0F14] border border-white/10 text-white text-sm rounded px-3 py-2 outline-none focus:border-[#00E5FF] transition-colors appearance-none cursor-pointer hover:border-white/20"
        >
          <option value="ALL">All Time</option>
          <option value="LAST_7_DAYS">Last 7 Days</option>
          <option value="THIS_SEMESTER">This Semester</option>
        </select>
      </div>
    </div>
  );
};
