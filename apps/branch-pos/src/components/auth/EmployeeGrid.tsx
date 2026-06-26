import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { ActiveUser, ActiveUsersResponse } from '@goldensoft/core-schemas';
import { AvatarCard } from './AvatarCard';
import { Users, Search, Loader2 } from 'lucide-react';

interface EmployeeGridProps {
  selectedUser: ActiveUser | null;
  onSelect: (user: ActiveUser) => void;
}

export function EmployeeGrid({ selectedUser, onSelect }: EmployeeGridProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['auth', 'active-users'],
    queryFn: async () => {
      const response = await api.get<ActiveUsersResponse>('/auth/users');
      return response.data.data;
    },
    staleTime: 60_000,
  });

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    if (!searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase();
    return data.filter(user => user.username.toLowerCase().includes(query));
  }, [data, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        <p className="text-slate-500 text-xs font-semibold">
          Loading staff roster...
        </p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
          <Users size={20} className="text-red-500" />
        </div>
        <div>
          <p className="text-slate-800 dark:text-slate-200 font-bold text-sm">Failed to load staff list</p>
          <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Please check your network connection.</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
          <Users size={20} className="text-slate-450" />
        </div>
        <div>
          <p className="text-slate-800 dark:text-slate-200 font-bold text-sm">No registered staff</p>
          <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Please create user profiles in the dashboard.</p>
        </div>
      </div>
    );
  }

  // Show search bar if there are many operators
  const showSearch = data.length > 8;

  return (
    <div className="w-full flex flex-col gap-4 h-full min-h-0">
      {/* Search Input */}
      {showSearch && (
        <div className="relative shrink-0">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
            size={16}
          />
          <input
            type="text"
            placeholder="Search operator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-550 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all"
          />
        </div>
      )}

      {/* Staff Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-1 overflow-y-auto max-h-[380px] pr-1 pb-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <AvatarCard
              key={user.id}
              user={user}
              isSelected={selectedUser?.id === user.id}
              onClick={onSelect}
            />
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-16 gap-2 text-center">
            <Search size={20} className="text-slate-350 dark:text-slate-700" />
            <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold">
              No operators match search
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

