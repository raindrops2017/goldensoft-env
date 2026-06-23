import { Modal } from "@/components/ui/modal";
import { useItemModifierAssignments } from "@/hooks/useModifiers";
import { useBranch } from "@/context/BranchContext";
import { useState, useMemo, useEffect } from "react";
import Button from "@/components/ui/button/Button";
import { ItemJson } from "@/interfaces/ItemInterface";
import Checkbox from "@/components/form/input/Checkbox";
import { useModifierGroups } from "@/hooks/useModifierGroups";
import { toast } from "sonner";

interface ModifierSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentItem: ItemJson;
  onConfirm: (selectedModifiers: any[]) => void;
}

export function ModifierSelectionModal({ isOpen, onClose, parentItem, onConfirm }: ModifierSelectionModalProps) {
  const { selectedBranch } = useBranch();
  const branchId = selectedBranch?.id ?? null;
  const { data: assignments, isLoading } = useItemModifierAssignments(branchId, parentItem.code);
  const { data: modifierGroups } = useModifierGroups(branchId);

  const [selectedModifiers, setSelectedModifiers] = useState<Record<number, boolean>>({});

  // Reset selections when parent item changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedModifiers({});
    }
  }, [isOpen, parentItem]);

  const slots = useMemo(() => {
    const s = [];
    if (parentItem.item_opt1) s.push({ grp_no: parentItem.item_opt1, qty: parentItem.sub_qty1 || 1 });
    if (parentItem.item_opt2) s.push({ grp_no: parentItem.item_opt2, qty: parentItem.sub_qty2 || 1 });
    if (parentItem.item_opt3) s.push({ grp_no: parentItem.item_opt3, qty: parentItem.sub_qty3 || 1 });
    if (parentItem.item_opt4) s.push({ grp_no: parentItem.item_opt4, qty: parentItem.sub_qty4 || 1 });
    return s;
  }, [parentItem]);

  const groupedAssignments = useMemo(() => {
    if (!assignments) return {};
    const grouped: Record<number, any[]> = {};
    assignments.forEach((a: any) => {
      if (!grouped[a.grp_no]) grouped[a.grp_no] = [];
      grouped[a.grp_no].push(a);
    });
    return grouped;
  }, [assignments]);

  const selectionsCountByGroup = useMemo(() => {
    const counts: Record<number, number> = {};
    (assignments || []).forEach((a: any) => {
      if (selectedModifiers[a.add_it_code]) {
        counts[a.grp_no] = (counts[a.grp_no] || 0) + 1;
      }
    });
    return counts;
  }, [selectedModifiers, assignments]);

  const handleToggle = (modifierItemCode: number, grp_no: number) => {
    const isCurrentlySelected = selectedModifiers[modifierItemCode];
    
    if (!isCurrentlySelected) {
      // Check if slot limit is reached
      const slot = slots.find(s => s.grp_no === grp_no);
      const currentCount = selectionsCountByGroup[grp_no] || 0;
      if (slot && currentCount >= slot.qty) {
        toast.error(`You can only select up to ${slot.qty} modifiers for this group`);
        return;
      }
    }

    setSelectedModifiers(prev => ({
      ...prev,
      [modifierItemCode]: !prev[modifierItemCode]
    }));
  };

  const handleConfirm = () => {
    const selected = (assignments || [])
      .filter((a: any) => selectedModifiers[a.add_it_code])
      .map((a: any) => ({
        ...a.ModifierItem,
        sale_price: Number(a.price_add), // Use the specific price for this assignment
        u_price: Number(a.price_add)
      }));
    
    onConfirm(selected);
  };

  if (isLoading) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl p-0 overflow-hidden">
      <div className="flex flex-col h-[70vh] bg-white dark:bg-gray-900">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Customize {parentItem.item}
          </h3>
          <p className="text-sm text-gray-500 mt-1">Select your preferred modifiers</p>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-8">
            {slots.map((slot) => {
              const group = modifierGroups?.find((g: any) => g.Code_g_o === slot.grp_no);
              const items = groupedAssignments[slot.grp_no] || [];
              const currentCount = selectionsCountByGroup[slot.grp_no] || 0;
              
              if (items.length === 0) return null;

              return (
                <div key={slot.grp_no} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-brand-600">
                      {group?.G_name_o || `Group ${slot.grp_no}`}
                    </h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${currentCount >= slot.qty ? 'bg-amber-100 text-amber-700' : 'bg-brand-100 text-brand-700'}`}>
                      {currentCount} / {slot.qty} selected
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {items.map((a: any) => {
                      const isSelected = !!selectedModifiers[a.add_it_code];
                      const isLimitReached = currentCount >= slot.qty && !isSelected;

                      return (
                        <div 
                          key={a.add_it_code}
                          onClick={() => handleToggle(a.add_it_code, slot.grp_no)}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-brand-50 border-brand-200 dark:bg-brand-500/10 dark:border-brand-500/50"
                              : isLimitReached
                                ? "bg-gray-100 border-transparent opacity-50 cursor-not-allowed dark:bg-white/[0.01]"
                                : "bg-gray-50 border-transparent hover:border-gray-200 dark:bg-white/[0.02] dark:hover:border-gray-700"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox 
                              checked={isSelected}
                              disabled={isLimitReached}
                              onChange={() => handleToggle(a.add_it_code, slot.grp_no)}
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {a.ModifierItem.item.startsWith("++") ? a.ModifierItem.item.slice(2) : a.ModifierItem.item}
                              </p>
                              <p className="text-xs text-gray-500">
                                {a.ModifierItem.A_item.startsWith("++") ? a.ModifierItem.A_item.slice(2) : a.ModifierItem.A_item}
                              </p>
                            </div>
                          </div>
                          {Number(a.price_add) > 0 && (
                            <span className="text-sm font-semibold text-brand-600">
                              +{a.price_add} EGP
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" className="flex-1" onClick={handleConfirm}>
            Add to Order
          </Button>
        </div>
      </div>
    </Modal>
  );
}
