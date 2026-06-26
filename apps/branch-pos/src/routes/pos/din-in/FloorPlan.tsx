import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import {
  useTableSections,
  useCreateSection,
  useCreateTable,
  useUpdateTable,
  useDeleteTable,
  useDeleteSection,
  useSeedDefaultLayout
} from '@/hooks/useTables';
import { useOpenChecks } from '@/hooks/api/useChecksApi';
import { useCurrentShift } from '@/hooks/api/useShiftApi';
import { PERMISSIONS } from '@goldensoft/core-schemas';
import { useLanSocket } from '@/hooks/useLanSocket';
import { TableChecksSelectionDialog } from '@/components/pos-ordering/TableChecksSelectionDialog';
import type { Table } from '@goldensoft/core-schemas';
import { Home, Trees, UserCheck, Utensils, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { toast } from 'sonner';

// Import SVG components provided by the user
import FreeTable from '@/icons/Free-Table';
import OccTable from '@/icons/Occ-Table';
import PrintedTable from '@/icons/Printed-Table';
import SplitedTable from '@/icons/Splited-Table';

// Import split subcomponents
import { FloorPlanHeader } from '@/components/pos-floor-plan/FloorPlanHeader';
import { FloorMobileGrid } from '@/components/pos-floor-plan/FloorMobileGrid';
import { FloorCanvas } from '@/components/pos-floor-plan/FloorCanvas';
import { TableConfigModal } from '@/components/pos-floor-plan/TableConfigModal';
import { AddSectionModal } from '@/components/pos-floor-plan/AddSectionModal';
import { AddBatchModal } from '@/components/pos-floor-plan/AddBatchModal';

const sectionIcons: Record<string, any> = {
  Outdoor: Trees,
  Indoor: Home,
  Officer: UserCheck,
  default: Utensils
};

const tableIconMap = {
  free: FreeTable,
  occupied: OccTable,
  printed: PrintedTable,
  splited: SplitedTable
};

export function FloorPlan() {
  const navigate = useNavigate();
  const { hasPermission: can } = usePermissions();
  const canEdit = can(PERMISSIONS.TABLES_EDIT);
  const { locks } = useLanSocket();

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
  const [activeSectionId, setActiveSectionId] = useState<string | null>(() => {
    return localStorage.getItem('goldensoft:lastSelectedSectionId');
  });

  // Edit mode toggle
  const [isEditMode, setIsEditMode] = useState(false);

  const [selectionTable, setSelectionTable] = useState<any | null>(null);
  const [selectionChecks, setSelectionChecks] = useState<any[]>([]);

  // Selected tables in edit mode (multi-select)
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);

  // Table ID currently being configured in the floating properties modal
  const [activeConfigTableId, setActiveConfigTableId] = useState<string | null>(null);

  // Dialog state for adding a section
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);

  // Batch create state
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);

  // Batch delete state
  const [isDeleteBatchOpen, setIsDeleteBatchOpen] = useState(false);

  // Confirmation Modals State
  const [sectionToDelete, setSectionToDelete] = useState<any | null>(null);
  const [tableToDelete, setTableToDelete] = useState<Table | null>(null);

  // Drag tracking state
  const [draggedTableId, setDraggedTableId] = useState<string | null>(null);
  const dragStartsRef = useRef<Record<string, { posX: number; posY: number }>>({});
  const pointerStartRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const hasDraggedRef = useRef<boolean>(false);

  // Local position overrides during active drag
  const [localPositions, setLocalPositions] = useState<Record<string, { posX: number; posY: number }>>({});

  // Viewport tracking & dynamic grid layout detection
  const observerRef = useRef<ResizeObserver | null>(null);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [containerSize, setContainerSize] = useState({ width: 1024, height: 600 });

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (node) {
      const updateSize = () => {
        if (node.clientWidth > 0 && node.clientHeight > 0) {
          setContainerSize({
            width: node.clientWidth,
            height: node.clientHeight
          });
        }
      };

      updateSize();
      const observer = new ResizeObserver(updateSize);
      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const isMobileGrid = useMemo(() => {
    return windowSize.width < 1024 || windowSize.height < 600;
  }, [windowSize]);

  // Sync activeSectionId to localStorage
  useEffect(() => {
    if (activeSectionId) {
      localStorage.setItem('goldensoft:lastSelectedSectionId', activeSectionId);
    }
  }, [activeSectionId]);

  // Auto-select first section when loaded or restore valid cached section
  useEffect(() => {
    if (sections.length > 0) {
      const isValid = activeSectionId ? sections.some((s) => s.id === activeSectionId) : false;
      if (!isValid) {
        const cached = localStorage.getItem('goldensoft:lastSelectedSectionId');
        const isCachedValid = cached ? sections.some((s) => s.id === cached) : false;
        if (isCachedValid) {
          setActiveSectionId(cached);
        } else {
          setActiveSectionId(sections[0].id);
        }
      }
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

  // Auto-disable Edit Mode on mobile sizes
  useEffect(() => {
    if (isMobileGrid && isEditMode) {
      setIsEditMode(false);
      setSelectedTableIds([]);
      setActiveConfigTableId(null);
    }
  }, [isMobileGrid, isEditMode]);

  // Active section object
  const activeSection = useMemo(() => {
    return sections.find((s) => s.id === activeSectionId) || null;
  }, [sections, activeSectionId]);

  // Active table configuration object
  const activeConfigTable = useMemo(() => {
    if (!activeSection) return null;
    return activeSection.tables.find((t) => t.id === activeConfigTableId) || null;
  }, [activeSection, activeConfigTableId]);

  // Flattened list of all tables in the database to calculate next table numbers
  const allTables = useMemo(() => {
    return sections.flatMap((s) => s.tables);
  }, [sections]);

  // Get table status
  const getTableStatus = useCallback((tableId: string) => {
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
  }, [currentShift, openChecks]);

  // Status-based styles
  const statusConfig = useMemo(() => ({
    free: {
      bg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-500/30',
      label: 'Free',
      pulse: 'bg-emerald-500'
    },
    occupied: {
      bg: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-500/30',
      label: 'Occupied',
      pulse: 'bg-amber-500'
    },
    printed: {
      bg: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400',
      border: 'border-red-200 dark:border-red-500/30',
      label: 'Printed',
      pulse: 'bg-red-500'
    },
    splited: {
      bg: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-500/30',
      label: 'Splited',
      pulse: 'bg-blue-500'
    }
  }), []);

  // Create section handler
  const handleCreateSection = async (name: string) => {
    try {
      const section = await createSectionMutation.mutateAsync({ name });
      setActiveSectionId(section.id);
      setIsAddSectionOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to calculate the next table position aligned in rows
  const getNextTablePosition = useCallback((
    existingTables: Table[],
    width = 100,
    height = 100
  ) => {
    if (!existingTables || existingTables.length === 0) {
      return { posX: 30, posY: 30 };
    }

    // Find the bottom-most table, and if multiple, the right-most table
    const sorted = [...existingTables].sort((a, b) => {
      if (a.posY !== b.posY) {
        return a.posY - b.posY;
      }
      return a.posX - b.posX;
    });

    const last = sorted[sorted.length - 1];

    // Check if there is space to the right in the same row
    const nextX = last.posX + last.tableWidth + 20;
    if (nextX + width <= 1024) {
      return { posX: nextX, posY: last.posY };
    } else {
      // Wrap to next row
      const nextY = last.posY + last.tableHeight + 20;
      return {
        posX: 30,
        posY: Math.min(nextY, 600 - height) // clamp to prevent vertical overflow
      };
    }
  }, []);

  // Create table handler
  const handleCreateTable = async () => {
    if (!activeSectionId || !activeSection) return;
    // Calculate next available number
    const maxNum = allTables.reduce((max, t) => Math.max(max, t.number), 0);
    const nextNumber = maxNum + 1 === 13 ? 14 : maxNum + 1; // Skip 13 logically

    const { posX, posY } = getNextTablePosition(activeSection.tables, 100, 100);

    try {
      const newTable = await createTableMutation.mutateAsync({
        number: nextNumber,
        name: `T${nextNumber}`,
        tableSectionId: activeSectionId,
        posX,
        posY,
        tableWidth: 100,
        tableHeight: 100,
        shape: 'rect'
      });
      setSelectedTableIds([newTable.id]);
    } catch (err) {
      console.error(err);
    }
  };

  // Clone table directly handler
  const handleCloneTableDirectly = async (tableToClone: Table) => {
    if (!activeSectionId || !activeSection) return;
    const maxNum = allTables.reduce((max, t) => Math.max(max, t.number), 0);
    const nextNumber = maxNum + 1 === 13 ? 14 : maxNum + 1;

    const { posX, posY } = getNextTablePosition(
      activeSection.tables,
      tableToClone.tableWidth,
      tableToClone.tableHeight
    );

    try {
      const clonedTable = await createTableMutation.mutateAsync({
        number: nextNumber,
        name: `T${nextNumber}`,
        tableSectionId: activeSectionId,
        posX,
        posY,
        tableWidth: tableToClone.tableWidth,
        tableHeight: tableToClone.tableHeight,
        shape: tableToClone.shape
      });
      setSelectedTableIds([clonedTable.id]);
    } catch (err) {
      console.error(err);
    }
  };

  // Create batch tables handler
  const handleCreateBatch = async (count: number) => {
    if (!activeSectionId || !activeSection || count <= 0) return;

    setIsAddBatchOpen(false);

    const currentTables = [...activeSection.tables];
    let maxNum = allTables.reduce((max, t) => Math.max(max, t.number), 0);
    const createdIds: string[] = [];

    for (let k = 0; k < count; k++) {
      const nextNumber = maxNum + 1 === 13 ? 14 : maxNum + 1;
      maxNum = nextNumber; // Use this table's number as base for next iteration

      const { posX, posY } = getNextTablePosition(currentTables, 100, 100);

      try {
        const newTable = await createTableMutation.mutateAsync({
          number: nextNumber,
          name: `T${nextNumber}`,
          tableSectionId: activeSectionId,
          posX,
          posY,
          tableWidth: 100,
          tableHeight: 100,
          shape: 'rect'
        });

        createdIds.push(newTable.id);
        currentTables.push(newTable);
      } catch (err) {
        console.error(err);
      }
    }

    if (createdIds.length > 0) {
      setSelectedTableIds(createdIds);
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

  const handleAlignSelected = async (alignment: 'left' | 'right' | 'top' | 'bottom') => {
    if (selectedTableIds.length < 2 || !activeSection) return;
    const anchorId = selectedTableIds[0];
    const anchor = activeSection.tables.find((t) => t.id === anchorId);
    if (!anchor) return;

    const updatedPositions: Record<string, { posX: number; posY: number }> = {};

    const promises = selectedTableIds.map(async (id) => {
      if (id === anchorId) return;
      const t = activeSection.tables.find((x) => x.id === id);
      if (!t) return;

      let newX = t.posX;
      let newY = t.posY;

      if (alignment === 'left') {
        newX = anchor.posX;
      } else if (alignment === 'right') {
        newX = anchor.posX + anchor.tableWidth - t.tableWidth;
      } else if (alignment === 'top') {
        newY = anchor.posY;
      } else if (alignment === 'bottom') {
        newY = anchor.posY + anchor.tableHeight - t.tableHeight;
      }

      // Clamp coordinates to virtual 1024x600 boundaries
      newX = Math.max(0, Math.min(1024 - t.tableWidth, Math.round(newX / 10) * 10));
      newY = Math.max(0, Math.min(600 - t.tableHeight, Math.round(newY / 10) * 10));

      updatedPositions[id] = { posX: newX, posY: newY };

      try {
        await updateTableMutation.mutateAsync({
          id,
          data: { posX: newX, posY: newY }
        });
      } catch (err) {
        console.error(err);
      }
    });

    try {
      await Promise.all(promises);
      setLocalPositions((prev) => ({
        ...prev,
        ...updatedPositions
      }));
      toast.success(`Aligned tables relative to ${anchor.name || `T${anchor.number}`}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to align some tables');
    }
  };

  const handleDistributeSelected = async (direction: 'horizontal' | 'vertical') => {
    if (selectedTableIds.length < 3 || !activeSection) {
      toast.warning('Select at least 3 tables to distribute');
      return;
    }

    const selectedTables = selectedTableIds
      .map((id) => activeSection.tables.find((t) => t.id === id))
      .filter((t): t is Table => !!t);

    if (direction === 'horizontal') {
      // Sort left-to-right
      selectedTables.sort((a, b) => a.posX - b.posX);

      const first = selectedTables[0];
      const last = selectedTables[selectedTables.length - 1];

      const totalSpan = last.posX + last.tableWidth - first.posX;
      const sumWidths = selectedTables.reduce((sum, t) => sum + t.tableWidth, 0);
      const remainingSpace = totalSpan - sumWidths;

      const gap = remainingSpace / (selectedTables.length - 1);
      const updatedPositions: Record<string, { posX: number; posY: number }> = {};

      let currentX = first.posX;

      const promises = selectedTables.map(async (t, index) => {
        if (index === 0) {
          currentX += t.tableWidth + gap;
          return;
        }
        if (index === selectedTables.length - 1) {
          return;
        }

        let newX = currentX;
        newX = Math.max(0, Math.min(1024 - t.tableWidth, Math.round(newX / 10) * 10));
        updatedPositions[t.id] = { posX: newX, posY: t.posY };

        currentX += t.tableWidth + gap;

        try {
          await updateTableMutation.mutateAsync({
            id: t.id,
            data: { posX: newX }
          });
        } catch (err) {
          console.error(err);
        }
      });

      try {
        await Promise.all(promises);
        setLocalPositions((prev) => ({ ...prev, ...updatedPositions }));
        toast.success('Distributed tables horizontally');
      } catch (err) {
        console.error(err);
      }
    } else {
      // Vertical distribution
      selectedTables.sort((a, b) => a.posY - b.posY);

      const first = selectedTables[0];
      const last = selectedTables[selectedTables.length - 1];

      const totalSpan = last.posY + last.tableHeight - first.posY;
      const sumHeights = selectedTables.reduce((sum, t) => sum + t.tableHeight, 0);
      const remainingSpace = totalSpan - sumHeights;

      const gap = remainingSpace / (selectedTables.length - 1);
      const updatedPositions: Record<string, { posX: number; posY: number }> = {};

      let currentY = first.posY;

      const promises = selectedTables.map(async (t, index) => {
        if (index === 0) {
          currentY += t.tableHeight + gap;
          return;
        }
        if (index === selectedTables.length - 1) {
          return;
        }

        let newY = currentY;
        newY = Math.max(0, Math.min(600 - t.tableHeight, Math.round(newY / 10) * 10));
        updatedPositions[t.id] = { posX: t.posX, posY: newY };

        currentY += t.tableHeight + gap;

        try {
          await updateTableMutation.mutateAsync({
            id: t.id,
            data: { posY: newY }
          });
        } catch (err) {
          console.error(err);
        }
      });

      try {
        await Promise.all(promises);
        setLocalPositions((prev) => ({ ...prev, ...updatedPositions }));
        toast.success('Distributed tables vertically');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleConfirmDeleteBatch = async () => {
    setIsDeleteBatchOpen(false);
    const deletePromises = selectedTableIds.map(async (id) => {
      try {
        await deleteTableMutation.mutateAsync(id);
      } catch (err) {
        console.error(err);
      }
    });

    try {
      await Promise.all(deletePromises);
      setSelectedTableIds([]);
      setActiveConfigTableId(null);
      toast.success('Deleted selected tables');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete some tables');
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
      setSelectedTableIds((prev) => prev.filter((id) => id !== tableToDelete.id));
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
    // Don't drag if settings or clone button was clicked
    if ((e.target as HTMLElement).closest('.settings-btn') || (e.target as HTMLElement).closest('.clone-btn')) {
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

    // Raw client movements (canvas is unscaled 1024x600 in edit mode)
    const deltaX = e.clientX - pointerStartRef.current.clientX;
    const deltaY = e.clientY - pointerStartRef.current.clientY;

    if (Math.abs(e.clientX - pointerStartRef.current.clientX) > 4 || Math.abs(e.clientY - pointerStartRef.current.clientY) > 4) {
      hasDraggedRef.current = true;
    }

    const updatedPositions = { ...localPositions };
    Object.entries(dragStartsRef.current).forEach(([id, start]) => {
      let nextX = start.posX + deltaX;
      let nextY = start.posY + deltaY;

      const t = activeSection?.tables.find((x) => x.id === id);
      const w = t?.tableWidth ?? 100;
      const h = t?.tableHeight ?? 100;

      // Clamp coords so tables don't go outside the virtual 1024x600 canvas
      nextX = Math.max(0, Math.min(1024 - w, Math.round(nextX / 10) * 10));
      nextY = Math.max(0, Math.min(600 - h, Math.round(nextY / 10) * 10));
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
      if (!(e.target as HTMLElement).closest('.settings-btn') && !(e.target as HTMLElement).closest('.clone-btn')) {
        setSelectedTableIds((prev) => {
          if (prev.includes(table.id)) {
            return prev.filter((id) => id !== table.id);
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

  const handleSelectCheck = (chkNo: number) => {
    if (selectionTable) {
      navigate(`/table/${selectionTable.number}?chkNo=${chkNo}`);
      setSelectionTable(null);
    }
  };

  const handleTableClick = useCallback((table: Table) => {
    const tableLock = locks[table.id];
    if (tableLock) {
      toast.warning(`Table is locked by ${tableLock.lockedBy.username}`);
      return;
    }

    if (table.belongsToCurrentUser === false) {
      toast.error("This table is occupied by another waiter's check / هذه الطاولة محجوزة لنادل آخر");
      return;
    }

    const tableChecks = openChecks.filter(
      (c) => c.tableId === table.id && c.chkDate === currentShift?.businessDate
    );

    if (tableChecks.length > 1) {
      setSelectionTable(table);
      setSelectionChecks(tableChecks);
    } else if (tableChecks.length === 1) {
      navigate(`/table/${table.number}?chkNo=${tableChecks[0].chkNo}`);
    } else {
      navigate(`/table/${table.number}`);
    }
  }, [locks, openChecks, currentShift, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0710] bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-[#1c122b] dark:via-[#0d0914] dark:to-[#0a0710] text-slate-900 dark:text-white flex flex-col font-sans transition-colors duration-300">
      <FloorPlanHeader
        sections={sections}
        activeSectionId={activeSectionId}
        setActiveSectionId={setActiveSectionId}
        isEditMode={isEditMode}
        setIsEditMode={setIsEditMode}
        canEdit={canEdit}
        isMobileGrid={isMobileGrid}
        selectedTableIds={selectedTableIds}
        setSelectedTableIds={setSelectedTableIds}
        setActiveConfigTableId={setActiveConfigTableId}
        setSectionToDelete={setSectionToDelete}
        setIsAddSectionOpen={setIsAddSectionOpen}
        handleSeedDefault={handleSeedDefault}
        seedDefaultPending={seedDefaultMutation.isPending}
        sectionIcons={sectionIcons}
        navigate={navigate}
      />

      {/* Main Canvas (Mobile Grid or Proportional Scaled View) */}
      <div className="flex-1 relative select-none overflow-hidden touch-none flex flex-col bg-slate-100 dark:bg-[#07050b]">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-400 font-medium">Loading Seating Layout...</span>
          </div>
        ) : !activeSection ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-6 z-10">
            <Layers className="w-16 h-16 text-slate-300 dark:text-slate-700" />
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                No layout sections found
              </h3>
              <p className="text-sm text-slate-500 dark:text-gray-400 max-w-sm mt-1">
                Create Seating Sections or load the seed layout config to populate tables.
              </p>
            </div>
            {isEditMode && (
              <Button
                onClick={() => setIsAddSectionOpen(true)}
                className="h-16 bg-indigo-600 hover:bg-indigo-700 rounded-2xl px-5 text-white font-bold cursor-pointer active:scale-95"
              >
                Add First Section
              </Button>
            )}
          </div>
        ) : isMobileGrid ? (
          <FloorMobileGrid
            activeSection={activeSection}
            locks={locks}
            getTableStatus={getTableStatus}
            statusConfig={statusConfig}
            tableIconMap={tableIconMap}
            handleTableClick={handleTableClick}
          />
        ) : (
          <FloorCanvas
            activeSection={activeSection}
            isEditMode={isEditMode}
            selectedTableIds={selectedTableIds}
            localPositions={localPositions}
            locks={locks}
            getTableStatus={getTableStatus}
            statusConfig={statusConfig}
            tableIconMap={tableIconMap}
            handleTableClick={handleTableClick}
            setActiveConfigTableId={setActiveConfigTableId}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            handleCreateTable={handleCreateTable}
            handleCloneTableDirectly={handleCloneTableDirectly}
            setIsAddBatchOpen={setIsAddBatchOpen}
            containerRef={containerRef}
            containerSize={containerSize}
            handleAlignSelected={handleAlignSelected}
            handleDistributeSelected={handleDistributeSelected}
            setIsDeleteBatchOpen={setIsDeleteBatchOpen}
          />
        )}
      </div>

      {/* Floating Property configurations Modal Overlay */}
      <TableConfigModal
        table={activeConfigTable}
        onClose={() => setActiveConfigTableId(null)}
        onUpdate={handleUpdateSelectedTable}
        onCopy={handleCopyTable}
        onDelete={setTableToDelete}
      />

      {/* Add Seating Section Modal */}
      <AddSectionModal
        isOpen={isAddSectionOpen}
        onClose={() => setIsAddSectionOpen(false)}
        onCreate={handleCreateSection}
      />

      {/* Add Batch Seating Section Dialog */}
      <AddBatchModal
        isOpen={isAddBatchOpen}
        onClose={() => setIsAddBatchOpen(false)}
        onAddBatch={handleCreateBatch}
      />

      {/* Confirmation Dialog for Section deletion */}
      <ConfirmationDialog
        isOpen={!!sectionToDelete}
        onClose={() => setSectionToDelete(null)}
        onConfirm={handleConfirmDeleteSection}
        title="Delete Seating Section?"
        description={
          sectionToDelete ? (
            <span>
              Are you sure you want to delete section <strong>{sectionToDelete.name}</strong> and all{' '}
              <strong>{sectionToDelete.tables.length}</strong> seating tables associated with it? This action
              cannot be undone.
            </span>
          ) : (
            ''
          )
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
              Are you sure you want to delete table <strong>{tableToDelete.name || tableToDelete.number}</strong>{' '}
              from layout?
            </span>
          ) : (
            ''
          )
        }
        confirmText="Delete Table"
        cancelText="Keep Table"
        isDestructive={true}
      />

      {/* Confirmation Dialog for Batch Table deletion */}
      <ConfirmationDialog
        isOpen={isDeleteBatchOpen}
        onClose={() => setIsDeleteBatchOpen(false)}
        onConfirm={handleConfirmDeleteBatch}
        title="Delete Selected Tables?"
        description={
          <span>
            Are you sure you want to delete the <strong>{selectedTableIds.length}</strong> selected tables?
            This action cannot be undone.
          </span>
        }
        confirmText={`Delete ${selectedTableIds.length} Tables`}
        cancelText="Keep Tables"
        isDestructive={true}
      />

      {/* Table Checks Selection Dialog */}
      {selectionTable && (
        <TableChecksSelectionDialog
          open={!!selectionTable}
          onClose={() => setSelectionTable(null)}
          table={selectionTable}
          checks={selectionChecks}
          onSelectCheck={handleSelectCheck}
        />
      )}
    </div>
  );
}
