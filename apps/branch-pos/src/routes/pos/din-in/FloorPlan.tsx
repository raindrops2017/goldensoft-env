import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  useTableSections,
  useCreateSection,
  useCreateTable,
  useUpdateTable,
  useDeleteTable,
  useDeleteSection,
  useSeedDefaultLayout
} from '../../../hooks/useTables';
import { useOpenChecks } from '../../../hooks/api/useChecksApi';
import { useCurrentShift } from '../../../hooks/api/useShiftApi';
import { PERMISSIONS } from '@goldensoft/core-schemas';
import type { Table, TableShape } from '@goldensoft/core-schemas';
import {
  Plus,
  Trash2,
  Copy,
  Layers,
  Lock,
  Unlock,
  Sparkles,
  Home,
  Trees,
  UserCheck,
  Utensils,
  X,
  Settings
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { ConfirmationDialog } from '../../../components/ui/ConfirmationDialog';
import { PinPad } from '../../../components/auth/PinPad';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/useAuthStore';
import type { LoginResponse } from '@goldensoft/core-schemas';

// Import SVG components provided by the user
import FreeTable from '../../../icons/Free-Table';
import OccTable from '../../../icons/Occ-Table';
import PrintedTable from '../../../icons/Printed-Table';
import SplitedTable from '../../../icons/Splited-Table';

const sectionIcons: Record<string, any> = {
  "Outdoor": Trees,
  "Indoor": Home,
  "Officer": UserCheck,
  "default": Utensils,
};

const tableIconMap = {
  free: FreeTable,
  occupied: OccTable,
  printed: PrintedTable,
  splited: SplitedTable,
};

export function FloorPlan() {
  const navigate = useNavigate();
  const { hasPermission: can } = usePermissions();
  const canEdit = can(PERMISSIONS.TABLES_EDIT);

  const { data: sections = [], isLoading } = useTableSections();
  const { data: openChecks = [] } = useOpenChecks();
  const { data: currentShift } = useCurrentShift();

  const createSectionMutation = useCreateSection();
  const createTableMutation = useCreateTable();
  const updateTableMutation = useUpdateTable();
  const deleteTableMutation = useDeleteTable();
  const deleteSectionMutation = useDeleteSection();
  const seedDefaultMutation = useSeedDefaultLayout();

  // Active section tab
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  // Edit mode toggle
  const [isEditMode, setIsEditMode] = useState(false);

  // Selected tables in edit mode (multi-select)
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);

  // Table ID currently being configured in the floating properties modal
  const [activeConfigTableId, setActiveConfigTableId] = useState<string | null>(null);

  // Dialog state for adding a section
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  // Confirmation Modals State
  const [sectionToDelete, setSectionToDelete] = useState<any | null>(null);
  const [tableToDelete, setTableToDelete] = useState<Table | null>(null);

  // Lock terminal state
  const [isLocked, setIsLocked] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const setAuth = useAuthStore((state) => state.setAuth);

  // Drag tracking state
  const [draggedTableId, setDraggedTableId] = useState<string | null>(null);
  const dragStartsRef = useRef<Record<string, { posX: number; posY: number }>>({});
  const pointerStartRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const hasDraggedRef = useRef<boolean>(false);

  // Local position overrides during active drag
  const [localPositions, setLocalPositions] = useState<Record<string, { posX: number; posY: number }>>({});

  // Auto-select first section when loaded
  useEffect(() => {
    if (sections.length > 0 && !activeSectionId) {
      setActiveSectionId(sections[0].id);
    }
  }, [sections, activeSectionId]);

  // Turn off Edit Mode if user logs out or does not have permissions anymore
  useEffect(() => {
    if (!canEdit && isEditMode) {
      setIsEditMode(false);
      setSelectedTableIds([]);
      setActiveConfigTableId(null);
    }
  }, [canEdit, isEditMode]);

  // Active section object
  const activeSection = useMemo(() => {
    return sections.find(s => s.id === activeSectionId) || null;
  }, [sections, activeSectionId]);

  // Active table configuration object
  const activeConfigTable = useMemo(() => {
    if (!activeSection) return null;
    return activeSection.tables.find(t => t.id === activeConfigTableId) || null;
  }, [activeSection, activeConfigTableId]);

  // Flattened list of all tables in the database to calculate next table numbers
  const allTables = useMemo(() => {
    return sections.flatMap(s => s.tables);
  }, [sections]);

  // Get table status
  const getTableStatus = (tableId: string) => {
    if (!currentShift) return 'free';
    
    // Get all open checks for this table on the current business date
    const tableChecks = openChecks.filter(
      (c) => c.tableId === tableId && c.chkDate === currentShift.businessDate
    );

    if (tableChecks.length === 0) return 'free';
    if (tableChecks.length > 1) return 'splited';
    
    // exactly 1 check
    if (tableChecks[0].printCount > 0) return 'printed';
    return 'occupied';
  };

  // Status-based styles
  const statusConfig: Record<string, { bg: string; border: string; label: string; pulse: string }> = {
    free: {
      bg: 'bg-emerald-500/5 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-500/30',
      label: 'Free',
      pulse: 'bg-emerald-500'
    },
    occupied: {
      bg: 'bg-amber-500/5 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
      border: 'border-amber-500/30',
      label: 'Occupied',
      pulse: 'bg-amber-500'
    },
    printed: {
      bg: 'bg-fuchsia-500/5 dark:bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400',
      border: 'border-fuchsia-500/30',
      label: 'Printed',
      pulse: 'bg-fuchsia-500'
    },
    splited: {
      bg: 'bg-rose-500/5 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
      border: 'border-rose-500/30',
      label: 'Splited',
      pulse: 'bg-rose-500'
    }
  };

  // Unlock mutation using PinPad credentials
  const unlockMutation = useMutation({
    mutationFn: async (credentials: { pin: string }) => {
      const response = await api.post<LoginResponse>('/auth/login', credentials);
      if (!response.data.success) {
        throw new Error(response.data.error || 'Invalid credentials');
      }
      return response.data.data;
    },
    onSuccess: (data) => {
      if (data.user) {
        setAuth(data.accessToken, data.user);
        setIsLocked(false);
        setLockError(null);
      } else {
        setLockError('Invalid user payload');
      }
    },
    onError: (err: any) => {
      setLockError(err.response?.data?.error || err.message || 'Unauthorized PIN');
    }
  });

  const handleUnlock = (data: { pin: string }) => {
    setLockError(null);
    unlockMutation.mutate(data);
  };

  // Create section handler
  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;
    try {
      const section = await createSectionMutation.mutateAsync({ name: newSectionName.trim() });
      setActiveSectionId(section.id);
      setNewSectionName('');
      setIsAddSectionOpen(false);
    } catch (err) {
      console.error(err);
    }
  };
  // Create table handler
  const handleCreateTable = async () => {
    if (!activeSectionId) return;
    // Calculate next available number
    const maxNum = allTables.reduce((max, t) => Math.max(max, t.number), 0);
    const nextNumber = maxNum + 1 === 13 ? 14 : maxNum + 1; // Skip 13 logically

    try {
      const newTable = await createTableMutation.mutateAsync({
        number: nextNumber,
        name: `T${nextNumber}`,
        tableSectionId: activeSectionId,
        posX: 120,
        posY: 120,
        tableWidth: 125,
        tableHeight: 125,
        shape: 'rect'
      });
      setSelectedTableIds([newTable.id]);
      setActiveConfigTableId(newTable.id);
    } catch (err) {
      console.error(err);
    }
  };

  // Duplicate table handler
  const handleCopyTable = async () => {
    if (!activeConfigTable || !activeSectionId) return;
    const maxNum = allTables.reduce((max, t) => Math.max(max, t.number), 0);
    const nextNumber = maxNum + 1 === 13 ? 14 : maxNum + 1;

    try {
      const clonedTable = await createTableMutation.mutateAsync({
        number: nextNumber,
        name: `T${nextNumber}`,
        tableSectionId: activeSectionId,
        posX: activeConfigTable.posX + 30,
        posY: activeConfigTable.posY + 30,
        tableWidth: activeConfigTable.tableWidth,
        tableHeight: activeConfigTable.tableHeight,
        shape: activeConfigTable.shape
      });
      setSelectedTableIds([clonedTable.id]);
      setActiveConfigTableId(clonedTable.id);
    } catch (err) {
      console.error(err);
    }
  };

  // Section deletion cascade handler
  const handleConfirmDeleteSection = async () => {
    if (!sectionToDelete) return;
    try {
      await deleteSectionMutation.mutateAsync(sectionToDelete.id);
      if (activeSectionId === sectionToDelete.id) {
        setActiveSectionId(null);
      }
      setSectionToDelete(null);
      setSelectedTableIds([]);
      setActiveConfigTableId(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Table deletion handler
  const handleConfirmDeleteTable = async () => {
    if (!tableToDelete) return;
    try {
      await deleteTableMutation.mutateAsync(tableToDelete.id);
      setSelectedTableIds(prev => prev.filter(id => id !== tableToDelete.id));
      setActiveConfigTableId(null);
      setTableToDelete(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Seed default layout handler
  const handleSeedDefault = async () => {
    if (confirm('This will RESET the layout. Seed default Outdoor, Indoor, and Officer sections with 30 tables each?')) {
      try {
        const seeded = await seedDefaultMutation.mutateAsync();
        if (seeded && seeded.length > 0) {
          setActiveSectionId(seeded[0].id);
        }
        setSelectedTableIds([]);
        setActiveConfigTableId(null);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Drag start
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>, table: Table) => {
    if (!isEditMode) return;
    // Don't drag if settings button was clicked
    if ((e.target as HTMLElement).closest('.settings-btn')) {
      return;
    }
    e.stopPropagation();

    setDraggedTableId(table.id);
    hasDraggedRef.current = false;

    // If the grabbed table is part of the current selection, drag all selected tables.
    // Otherwise, drag only the grabbed table.
    const isGrabbedTableSelected = selectedTableIds.includes(table.id);
    const dragGroup = isGrabbedTableSelected ? selectedTableIds : [table.id];

    // Save starting positions of all tables in the drag group
    const starts: Record<string, { posX: number; posY: number }> = {};
    dragGroup.forEach((id) => {
      const t = activeSection?.tables.find((x) => x.id === id);
      if (t) {
        starts[id] = {
          posX: localPositions[id]?.posX ?? t.posX,
          posY: localPositions[id]?.posY ?? t.posY
        };
      }
    });

    dragStartsRef.current = starts;
    pointerStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY
    };

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  // Dragging
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isEditMode || !draggedTableId || !pointerStartRef.current || !dragStartsRef.current) return;
    e.stopPropagation();

    const deltaX = e.clientX - pointerStartRef.current.clientX;
    const deltaY = e.clientY - pointerStartRef.current.clientY;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      hasDraggedRef.current = true;
    }

    const updatedPositions = { ...localPositions };
    Object.entries(dragStartsRef.current).forEach(([id, start]) => {
      let nextX = start.posX + deltaX;
      let nextY = start.posY + deltaY;
      nextX = Math.max(0, Math.round(nextX / 10) * 10);
      nextY = Math.max(0, Math.round(nextY / 10) * 10);
      updatedPositions[id] = { posX: nextX, posY: nextY };
    });

    setLocalPositions(updatedPositions);
  };

  // Drag end
  const onPointerUp = async (e: React.PointerEvent<HTMLDivElement>, table: Table) => {
    if (!isEditMode) return;
    e.stopPropagation();
    e.currentTarget.releasePointerCapture(e.pointerId);

    const wasDragging = hasDraggedRef.current;
    const dragGroupIds = Object.keys(dragStartsRef.current);

    setDraggedTableId(null);
    pointerStartRef.current = null;
    dragStartsRef.current = {};

    if (wasDragging) {
      // Save all updated coordinates to backend for the dragged group
      const updatePromises = dragGroupIds.map(async (id) => {
        const finalPos = localPositions[id];
        if (finalPos) {
          try {
            await updateTableMutation.mutateAsync({
              id,
              data: {
                posX: finalPos.posX,
                posY: finalPos.posY
              }
            });
          } catch (err) {
            console.error(err);
          }
        }
      });

      try {
        await Promise.all(updatePromises);
      } catch (err) {
        console.error(err);
      }
    } else {
      // If we clicked/tapped without dragging, toggle this table's selection status
      if (!(e.target as HTMLElement).closest('.settings-btn')) {
        setSelectedTableIds(prev => {
          if (prev.includes(table.id)) {
            return prev.filter(id => id !== table.id);
          } else {
            return [...prev, table.id];
          }
        });
      }
    }
  };

  // Edit modal input property handlers
  const handleUpdateSelectedTable = async (fields: Partial<Table>) => {
    if (!activeConfigTableId) return;
    try {
      await updateTableMutation.mutateAsync({
        id: activeConfigTableId,
        data: fields
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0710] bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-[#1c122b] dark:via-[#0d0914] dark:to-[#0a0710] text-slate-900 dark:text-white flex flex-col font-sans transition-colors duration-300">

      {/* 1-Row Compact Seating Header */}
      <header className="h-16 px-6 bg-white/80 dark:bg-[#15111d]/85 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 flex items-center justify-between shadow-sm z-20">

        {/* Left: Compact Section tabs list */}
        <div className="flex items-center gap-2 overflow-x-auto select-none no-scrollbar py-1">
          {sections.map((section) => {
            const SectionIcon = sectionIcons[section.name] || sectionIcons.default;
            const isActive = activeSectionId === section.id;
            return (
              <div
                key={section.id}
                className="flex items-center shrink-0"
              >
                <button
                  onClick={() => {
                    setActiveSectionId(section.id);
                    setSelectedTableIds([]);
                    setActiveConfigTableId(null);
                  }}
                  className={`h-11 px-4 rounded-xl border flex items-center gap-2 font-bold tracking-wide transition-all active:scale-95 duration-75 text-xs cursor-pointer ${isActive
                      ? 'bg-indigo-600/10 border-indigo-600/40 text-indigo-600 dark:text-indigo-400'
                      : 'bg-white dark:bg-[#1a1626] border-slate-200 dark:border-white/5 text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-[#211d31]'
                    }`}
                >
                  <SectionIcon className="w-3.5 h-3.5" />
                  <span>{section.name}</span>
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-indigo-600 dark:bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'}`}>
                    {section.tables.length}
                  </span>
                </button>

                {/* Delete Section close cross shown only in edit mode */}
                {isEditMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSectionToDelete(section);
                    }}
                    className="ml-1 w-7 h-11 flex items-center justify-center text-red-500 hover:text-red-600 active:scale-90 transition-transform cursor-pointer bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 rounded-xl"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}

          {isEditMode && (
            <button
              onClick={() => setIsAddSectionOpen(true)}
              className="h-11 px-3 border border-dashed border-slate-300 dark:border-white/10 rounded-xl flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1d192a] font-bold text-xs active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Section
            </button>
          )}
        </div>

        {/* Right: Controls (Lock, Edit/Save, Exit) */}
        <div className="flex items-center gap-2">
          {isEditMode && activeSection && (
            <div className="flex items-center gap-2 mr-2 select-none">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedTableIds(activeSection.tables.map(t => t.id));
                }}
                className="h-11 px-3.5 rounded-xl text-xs font-bold bg-white dark:bg-[#1a1626] border-slate-200 dark:border-white/5 text-slate-600 dark:text-gray-300 active:scale-95 cursor-pointer"
              >
                Select All ({activeSection.tables.length})
              </Button>
              {selectedTableIds.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setSelectedTableIds([])}
                  className="h-11 px-3.5 rounded-xl text-xs font-bold text-red-500 bg-red-500/5 hover:bg-red-500/10 border-red-500/20 active:scale-95 cursor-pointer"
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
              disabled={seedDefaultMutation.isPending}
              className="h-11 px-3.5 rounded-xl border-dashed border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 dark:text-blue-400 font-bold text-xs active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              {seedDefaultMutation.isPending ? 'Seeding...' : 'Seed Layout'}
            </Button>
          )}

          {/* Lock terminal button */}
          <button
            onClick={() => setIsLocked(true)}
            className="w-11 h-11 bg-slate-100 dark:bg-[#1e192c] hover:bg-slate-200 dark:hover:bg-[#28223a] text-slate-600 dark:text-gray-300 border border-slate-200 dark:border-white/5 rounded-xl flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
            title="Lock Terminal"
          >
            <Lock className="w-4 h-4" />
          </button>

          {/* Edit / Save layout buttons */}
          {canEdit && (
            <button
              onClick={() => {
                setIsEditMode(prev => !prev);
                setSelectedTableIds([]);
                setActiveConfigTableId(null);
              }}
              className={`h-11 px-4 rounded-xl font-bold text-xs active:scale-95 duration-75 flex items-center gap-1.5 transition-colors cursor-pointer border ${isEditMode
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600'
                }`}
            >
              {isEditMode ? (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Save Layout</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Edit Layout</span>
                </>
              )}
            </button>
          )}

          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="h-11 px-4 rounded-xl border-slate-200 dark:border-white/10 dark:bg-[#252036] text-xs font-bold"
          >
            Exit
          </Button>
        </div>
      </header>

      {/* Main Canvas (Expanded full width/height) */}
      <div className="flex-1 relative select-none overflow-hidden touch-none">

        {/* Seating Canvas Grid Area */}
        <section className="absolute inset-0 bg-[#0f0c1b]/30 dark:bg-black/35 overflow-hidden flex flex-col">

          {/* Subtle snap grid layout overlay in edit mode */}
          {isEditMode && (
            <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-10"
              style={{
                backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1.5px)',
                backgroundSize: '20px 20px'
              }}
            />
          )}

          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-slate-400 font-medium">Loading Seating Layout...</span>
            </div>
          ) : !activeSection ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-6 z-10">
              <Layers className="w-16 h-16 text-slate-300 dark:text-slate-700" />
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No layout sections found</h3>
                <p className="text-sm text-slate-500 dark:text-gray-400 max-w-sm mt-1">Create Seating Sections or load the seed layout config to populate tables.</p>
              </div>
              {isEditMode && (
                <Button onClick={() => setIsAddSectionOpen(true)} className="h-12 bg-indigo-600 hover:bg-indigo-700 rounded-xl px-5 text-white font-bold cursor-pointer">
                  Add First Section
                </Button>
              )}
            </div>
          ) : (
            <div className="flex-1 relative overflow-auto p-12" id="seating-canvas">

              {activeSection.tables.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <span className="text-slate-400 text-sm font-semibold">No Seating tables placed in this section.</span>
                  {isEditMode && (
                    <Button onClick={handleCreateTable} variant="outline" className="h-11 rounded-xl px-4 border-slate-200 dark:border-white/10 dark:text-white dark:bg-[#201b2f] mt-2 active:scale-95 cursor-pointer">
                      <Plus className="w-4 h-4 mr-1.5" /> Place Table
                    </Button>
                  )}
                </div>
              ) : (
                activeSection.tables.map((table) => {
                  const localPos = localPositions[table.id];
                  const posX = localPos ? localPos.posX : table.posX;
                  const posY = localPos ? localPos.posY : table.posY;
                  const isSelected = selectedTableIds.includes(table.id);
                  const status = getTableStatus(table.id);
                  const config = statusConfig[status];

                  // Dynamically resolve custom SVG component
                  const TableSvgIcon = tableIconMap[status] || FreeTable;

                  return (
                    <div
                      key={table.id}
                      onPointerDown={(e) => onPointerDown(e, table)}
                      onPointerMove={onPointerMove}
                      onPointerUp={(e) => onPointerUp(e, table)}
                      onClick={() => {
                        if (!isEditMode) {
                          // Tap navigates to order mock path
                          navigate(`/table/${table.number}`);
                        }
                      }}
                      className={`absolute select-none cursor-pointer border-2 flex flex-col items-center justify-center group font-sans active:scale-95 transition-all duration-100 ${table.shape === 'circle' ? 'rounded-full' : 'rounded-[2rem]'
                        } ${isEditMode
                          ? isSelected
                            ? 'border-indigo-600 bg-indigo-600/20 ring-4 ring-indigo-600/10 shadow-lg scale-105'
                            : 'border-slate-400/30 hover:border-slate-400/60 bg-white/5 dark:bg-[#1a1626]/40 shadow-sm'
                          : `${config.bg} ${config.border} hover:scale-102 hover:shadow-lg`
                        }`}
                      style={{
                        left: `${posX}px`,
                        top: `${posY}px`,
                        width: `${table.tableWidth}px`,
                        height: `${table.tableHeight}px`,
                        touchAction: 'none'
                      }}
                    >
                      {/* Properties settings icon shown on every table in edit mode only */}
                      {isEditMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setActiveConfigTableId(table.id);
                          }}
                          className="settings-btn absolute top-2 right-2 w-8 h-8 rounded-full bg-slate-800/90 dark:bg-[#1a1626] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-indigo-600 hover:border-indigo-600 active:scale-90 transition-all z-10 shadow-md cursor-pointer"
                          title="Configure Table"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      )}

                      {/* Check state pulse dot overlay */}
                      {!isEditMode && status !== 'free' && (
                        <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
                          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${config.pulse}`}></span>
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.pulse}`}></span>
                        </span>
                      )}

                      {/* Render direct SVG imported components */}
                      <div className="w-[50%] h-[50%] flex items-center justify-center text-current mb-1 [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain">
                        <TableSvgIcon />
                      </div>

                      <span className="font-extrabold tracking-tight text-xs sm:text-sm text-slate-800 dark:text-white">
                        {table.name || `T${table.number}`}
                      </span>

                      {/* Show status label in non-edit mode */}
                      {!isEditMode && (
                        <span className="text-[9px] font-black uppercase tracking-wider scale-90 opacity-90 mt-0.5">
                          {config.label}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Floating plus button inside canvas in edit mode to easily drop a table */}
          {isEditMode && activeSection && (
            <button
              onClick={handleCreateTable}
              className="absolute bottom-6 right-6 w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:bg-indigo-700 active:scale-90 transition-transform cursor-pointer"
              title="Add New Seating Table"
            >
              <Plus className="w-8 h-8" />
            </button>
          )}
        </section>
      </div>

      {/* Center Floating Properties Modal Overlay (Edit Mode Center Modal) */}
      {isEditMode && activeConfigTable && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#15111d] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in duration-100">

            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-3">
              <h3 className="text-base font-black tracking-wider uppercase flex items-center gap-1.5 dark:text-white">
                <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Configure Table
              </h3>
              <button
                onClick={() => setActiveConfigTableId(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer active:scale-95 text-slate-500 dark:text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name field */}
              <div className="space-y-1">
                <label className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Table Label</label>
                <input
                  type="text"
                  value={activeConfigTable.name}
                  onChange={(e) => handleUpdateSelectedTable({ name: e.target.value })}
                  className="w-full h-11 bg-slate-50 dark:bg-[#201b2f] border border-slate-200 dark:border-white/5 rounded-xl px-3 text-sm font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-500"
                />
              </div>

              {/* Number field */}
              <div className="space-y-1">
                <label className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Table ID/No</label>
                <input
                  type="number"
                  value={activeConfigTable.number}
                  onChange={(e) => handleUpdateSelectedTable({ number: parseInt(e.target.value) || 0 })}
                  className="w-full h-11 bg-slate-50 dark:bg-[#201b2f] border border-slate-200 dark:border-white/5 rounded-xl px-3 text-sm font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-500"
                />
              </div>

              {/* Shape selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Table Shape</label>
                <div className="flex gap-2">
                  {(['rect', 'circle'] as TableShape[]).map((shape) => (
                    <button
                      key={shape}
                      onClick={() => handleUpdateSelectedTable({ shape })}
                      className={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer active:scale-95 ${activeConfigTable.shape === shape
                          ? 'bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500 text-white shadow-md'
                          : 'bg-slate-50 dark:bg-[#201b2f] border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-100'
                        }`}
                    >
                      {shape === 'rect' ? 'Rectangle' : 'Circle'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Width slider */}
              <div className="space-y-0.5">
                <div className="flex justify-between items-center text-[10px] font-black tracking-wider text-slate-400 uppercase">
                  <span>Width</span>
                  <span>{activeConfigTable.tableWidth}px</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="180"
                  step="5"
                  value={activeConfigTable.tableWidth}
                  onChange={(e) => handleUpdateSelectedTable({ tableWidth: parseInt(e.target.value) })}
                  className="w-full accent-indigo-600 dark:accent-indigo-500 h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Height slider */}
              <div className="space-y-0.5">
                <div className="flex justify-between items-center text-[10px] font-black tracking-wider text-slate-400 uppercase">
                  <span>Height</span>
                  <span>{activeConfigTable.tableHeight}px</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="180"
                  step="5"
                  value={activeConfigTable.tableHeight}
                  onChange={(e) => handleUpdateSelectedTable({ tableHeight: parseInt(e.target.value) })}
                  className="w-full accent-indigo-600 dark:accent-indigo-500 h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-white/5 pt-3 mt-1 flex flex-col gap-2">
              {/* Copy action */}
              <button
                onClick={handleCopyTable}
                className="w-full h-11 bg-slate-100 dark:bg-[#221b33] hover:bg-slate-200 dark:hover:bg-[#2b2241] border border-slate-200 dark:border-white/5 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                Clone Table Settings
              </button>

              {/* Delete action */}
              <button
                onClick={() => setTableToDelete(activeConfigTable)}
                className="w-full h-11 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Seating Section Modal */}
      {isAddSectionOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#15111d] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in duration-100">
            <div>
              <h3 className="text-base font-black tracking-wider uppercase dark:text-white">Create Layout Section</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Add seating segment (e.g. VIP Terrace, Indoor Bar)</p>
            </div>

            <form onSubmit={handleCreateSection} className="space-y-4">
              <input
                type="text"
                autoFocus
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="Section Name..."
                className="w-full h-12 bg-slate-50 dark:bg-[#201b2f] border border-slate-200 dark:border-white/5 rounded-xl px-4 text-sm font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-500"
              />

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddSectionOpen(false);
                    setNewSectionName('');
                  }}
                  className="flex-1 h-11 rounded-xl text-xs font-bold border-slate-200 dark:border-white/10 dark:bg-[#1a1525] dark:text-white cursor-pointer active:scale-95"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!newSectionName.trim()}
                  className="flex-1 h-11 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-95"
                >
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Section deletion */}
      <ConfirmationDialog
        isOpen={!!sectionToDelete}
        onClose={() => setSectionToDelete(null)}
        onConfirm={handleConfirmDeleteSection}
        title="Delete Seating Section?"
        description={
          sectionToDelete ? (
            <span>
              Are you sure you want to delete section <strong>{sectionToDelete.name}</strong> and all <strong>{sectionToDelete.tables.length}</strong> seating tables associated with it? This action cannot be undone.
            </span>
          ) : ''
        }
        confirmText="Delete Section"
        cancelText="Keep Section"
        isDestructive={true}
      />

      {/* Confirmation Dialog for Table deletion */}
      <ConfirmationDialog
        isOpen={!!tableToDelete}
        onClose={() => setTableToDelete(null)}
        onConfirm={handleConfirmDeleteTable}
        title="Delete Table?"
        description={
          tableToDelete ? (
            <span>
              Are you sure you want to delete table <strong>{tableToDelete.name || tableToDelete.number}</strong> from layout?
            </span>
          ) : ''
        }
        confirmText="Delete Table"
        cancelText="Keep Table"
        isDestructive={true}
      />

      {/* Full-Screen PIN Lock Overlay Screen */}
      {isLocked && (
        <div className="fixed inset-0 z-50 bg-[#07050b]/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-lg">
            <PinPad
              onSubmit={handleUnlock}
              isLoading={unlockMutation.isPending}
              error={lockError}
            />
          </div>
        </div>
      )}
    </div>
  );
}
