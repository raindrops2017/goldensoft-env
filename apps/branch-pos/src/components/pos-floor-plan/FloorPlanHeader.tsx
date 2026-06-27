import { Button } from '@/components/ui/button';
import {
  Lock,
  Sparkles,
  Plus,
  X,
  Save,
  Edit,
  ShoppingBag,
  Motorbike,
  List
} from 'lucide-react';
import type { TableSectionWithTables } from '@/hooks/useTables';
import { HasPermission } from '../auth/HasPermission';
import { PERMISSIONS } from '@goldensoft/core-schemas';
import { useLockStore } from '@/store/useLockStore';
import { useAuthStore } from '@/store/useAuthStore';

interface FloorPlanHeaderProps {
  sections: TableSectionWithTables[];
  activeSectionId: string | null;
  setActiveSectionId: (id: string | null) => void;
  openedChecksCount?: number;
  isEditMode: boolean;
  setIsEditMode: (val: boolean) => void;
  canEdit: boolean;
  isMobileGrid: boolean;
  selectedTableIds: string[];
  setSelectedTableIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  setActiveConfigTableId: (id: string | null) => void;
  setSectionToDelete: (section: TableSectionWithTables | null) => void;
  setIsAddSectionOpen: (val: boolean) => void;
  handleSeedDefault: () => void;
  seedDefaultPending: boolean;
  sectionIcons: Record<string, any>;
  navigate: (path: string) => void;
}

export function FloorPlanHeader({
  sections,
  activeSectionId,
  setActiveSectionId,
  openedChecksCount = 0,
  isEditMode,
  setIsEditMode,
  canEdit,
  isMobileGrid,
  selectedTableIds,
  setSelectedTableIds,
  setActiveConfigTableId,
  setSectionToDelete,
  setIsAddSectionOpen,
  handleSeedDefault,
  seedDefaultPending,
  sectionIcons,
  navigate
}: FloorPlanHeaderProps) {
  const activeSection = sections.find(s => s.id === activeSectionId);
  const lock = useLockStore((state) => state.lock);
  const currentUser = useAuthStore((state) => state.user);

  return (
    <header className="h-20 px-6 bg-white/80 dark:bg-[#15111d]/85 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 flex items-center justify-between shadow-sm z-20">
      {/* Left: Compact Section tabs list */}
      <div className="flex items-center gap-2 overflow-x-auto select-none no-scrollbar py-1">
        {sections.map((section) => {
          const SectionIcon = sectionIcons[section.name] || sectionIcons.default;
          const isActive = activeSectionId === section.id;
          return (
            <div key={section.id} className="flex items-center shrink-0">
              <button
                onClick={() => {
                  setActiveSectionId(section.id);
                  setSelectedTableIds([]);
                  setActiveConfigTableId(null);
                }}
                className={`h-16 px-5 rounded-2xl border flex items-center gap-2.5 font-bold tracking-wide transition-all active:scale-95 duration-75 text-sm cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600/10 border-indigo-600/40 text-indigo-600 dark:text-indigo-400'
                    : 'bg-white dark:bg-[#1a1626] border-slate-200 dark:border-white/5 text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-[#211d31]'
                }`}
              >
                <SectionIcon className="w-4 h-4" />
                <span>{section.name}</span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
                      : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {section.tables ? section.tables.length : 0}
                </span>
              </button>

              {/* Delete Section close cross shown only in edit mode */}
              {isEditMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSectionToDelete(section);
                  }}
                  className="ml-1.5 w-10 h-16 flex items-center justify-center text-red-500 hover:text-red-600 active:scale-90 transition-transform cursor-pointer bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 rounded-2xl"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}

        {/* Opened Checks Tab */}
        <div className="flex items-center shrink-0">
          <button
            onClick={() => {
              setActiveSectionId('opened-checks');
              setSelectedTableIds([]);
              setActiveConfigTableId(null);
            }}
            className={`h-16 px-5 rounded-2xl border flex items-center gap-2.5 font-bold tracking-wide transition-all active:scale-95 duration-75 text-sm cursor-pointer ${
              activeSectionId === 'opened-checks'
                ? 'bg-amber-600/10 border-amber-600/40 text-amber-600 dark:text-amber-400'
                : 'bg-white dark:bg-[#1a1626] border-slate-200 dark:border-white/5 text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-[#211d31]'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Opened Checks</span>
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                activeSectionId === 'opened-checks'
                  ? 'bg-amber-600 dark:bg-amber-500 text-white'
                  : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'
              }`}
            >
              {openedChecksCount}
            </span>
          </button>
        </div>

        {isEditMode && (
          <button
            onClick={() => setIsAddSectionOpen(true)}
            className="h-16 px-4 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1d192a] font-bold text-xs active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Section
          </button>
        )}
      </div>

      {/* Right: Controls (Lock, Edit/Save, Exit) */}
      <div className="flex items-center gap-2">
        {isEditMode && activeSection && activeSection.tables && (
          <div className="flex items-center gap-2 mr-2 select-none">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedTableIds(activeSection.tables.map((t) => t.id));
              }}
              className="h-16 px-5 rounded-2xl text-sm font-bold bg-white dark:bg-[#1a1626] border-slate-200 dark:border-white/5 text-slate-600 dark:text-gray-300 active:scale-95 cursor-pointer"
            >
              Select All ({activeSection.tables.length})
            </Button>
            {selectedTableIds.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setSelectedTableIds([])}
                className="h-16 px-5 rounded-2xl text-sm font-bold text-red-500 bg-red-500/5 hover:bg-red-500/10 border-red-500/20 active:scale-95 cursor-pointer"
              >
                Clear Selection ({selectedTableIds.length})
              </Button>
            )}
          </div>
        )}
        {isEditMode && (
          <Button
            variant="outline"
            onClick={handleSeedDefault}
            disabled={seedDefaultPending}
            className="h-16 px-5 rounded-2xl border-dashed border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 dark:text-blue-400 font-bold text-sm active:scale-95"
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            {seedDefaultPending ? 'Seeding...' : 'Seed Layout'}
          </Button>
        )}

        {/* Edit / Save layout buttons */}
        {canEdit && !isMobileGrid && (
          <button
            onClick={() => {
              setIsEditMode(!isEditMode);
              setSelectedTableIds([]);
              setActiveConfigTableId(null);
            }}
            className={`h-16 px-5 rounded-2xl font-bold text-sm active:scale-95 duration-75 flex items-center gap-1.5 transition-colors cursor-pointer border ${
              isEditMode
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600'
            }`}
          >
            {isEditMode ? (
              <>
                <Save className="w-4 h-4" />
                <span>Save Layout</span>
              </>
            ) : (
              <>
                <Edit className="w-4 h-4" />
              </>
            )}
          </button>
        )}

        {!isEditMode && (
          <HasPermission permission={PERMISSIONS.DELIVERY_OPEN}>
            <Button
          variant="outline"
          onClick={() => navigate('/delivery')}
          className="h-16 px-5 rounded-2xl border-slate-200 dark:border-white/10 dark:bg-[#252036] text-sm font-bold active:scale-95"
        >
          <Motorbike className="w-4 h-4" />
          Delivery
        </Button>
          </HasPermission>
          
        )}

        {!isEditMode && (
          <HasPermission permission={PERMISSIONS.TAKEAWAY_OPEN}>
          <Button
          variant="outline"
          onClick={() => navigate('/takeaway')}
          className="h-16 px-5 rounded-2xl border-slate-200 dark:border-white/10 dark:bg-[#252036] text-sm font-bold active:scale-95"
        >
          <ShoppingBag className="w-4 h-4" />
          TakeAway
        </Button>
          </HasPermission>  
        )}

        {/* Lock terminal button */}
        {!isEditMode && (
          <Button
          variant="destructive"
          onClick={() => {
            if (currentUser) {
              lock(currentUser);
            }
          }}
          className="h-16 px-5 rounded-2xl bg-red-600 hover:bg-red-700 text-white border border-red-500 font-bold text-sm active:scale-95"
          title="Lock Terminal"
        >
          <Lock className="w-4 h-4" />
        </Button>
        )}
        
        {!isEditMode && (
        <Button
          variant="destructive"
          onClick={() => navigate('/')}
          className="h-16 px-5 rounded-2xl border-slate-200 dark:border-white/10 dark:bg-[#252036] text-sm font-bold active:scale-95"
        >
          <X className="w-4 h-4" />
          Exit
        </Button>
        )}
      </div>
    </header>
  );
}
