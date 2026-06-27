import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { MenuItem } from "@goldensoft/core-schemas";
import { useMenuApi } from "@/hooks/api/useMenuApi";
import { toast } from "sonner";
import { ChevronLeft, CheckCircle2 } from "lucide-react";

interface Props {
  parentItem: MenuItem;
  onConfirm: (modifiers: any[]) => void;
  onCancel: () => void;
}

export default function ModifierGrid({ parentItem, onConfirm, onCancel }: Props) {
  const { data: menuData, isLoading } = useMenuApi();
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, boolean>>({});
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Filter groups to only the ones actually assigned to the item, sorted by groupOrder
  const itemModifierGroups = useMemo(() => {
    return (parentItem.modifiers || [])
      .slice()
      .sort((a, b) => (a.groupOrder || 0) - (b.groupOrder || 0));
  }, [parentItem]);

  const modifierGroups = menuData?.modifierGroups || [];
  const allModifiers = menuData?.modifiers || [];

  const selectionsCountByGroup = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.keys(selectedModifiers).forEach((modId) => {
      if (selectedModifiers[modId]) {
        const mod = allModifiers.find((m) => m.id === modId);
        if (mod) {
          counts[mod.modifiersGroupId] = (counts[mod.modifiersGroupId] || 0) + 1;
        }
      }
    });
    return counts;
  }, [selectedModifiers, allModifiers]);

  const currentSlot = itemModifierGroups[currentStepIndex];
  const isForced = currentSlot?.choiceCount > 0;
  const currentCount = currentSlot ? (selectionsCountByGroup[currentSlot.modifiersGroupId] || 0) : 0;
  const maxChoices = currentSlot?.choiceCount || 0;

  // Auto-advance if choiceCount is reached
  useEffect(() => {
    if (isForced && currentCount === maxChoices) {
      handleNext();
    }
  }, [currentCount, isForced, maxChoices]);

  if (isLoading || !currentSlot) {
    return null;
  }

  const group = modifierGroups.find((g) => g.id === currentSlot.modifiersGroupId);
  const items = allModifiers.filter((m) => m.modifiersGroupId === currentSlot.modifiersGroupId);

  const handleToggle = (modifierId: string) => {
    const isCurrentlySelected = selectedModifiers[modifierId];

    if (!isCurrentlySelected && isForced) {
      if (currentCount >= maxChoices) {
        toast.error(`You can only select up to ${maxChoices} modifiers for this group`);
        return;
      }
    }

    setSelectedModifiers((prev) => ({
      ...prev,
      [modifierId]: !prev[modifierId],
    }));
  };

  const handleNext = () => {
    if (isForced && currentCount !== maxChoices) {
      toast.error(`Please select exactly ${maxChoices} option(s)`);
      return;
    }

    if (currentStepIndex < itemModifierGroups.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Finished all groups
      const finalized = allModifiers
        .filter((m) => selectedModifiers[m.id])
        .map((m) => ({
          menuItemModifierId: itemModifierGroups.find(g => g.modifiersGroupId === m.modifiersGroupId)?.id || "",
          modifierId: m.id,
          name: m.name,
          price: m.price || 0,
          qty: 1, // Future: Handle multiple qty of same modifier if needed
        }));
      onConfirm(finalized);
    }
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="mb-1 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-2">
          {!isForced && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-8 flex items-center gap-1 text-red-600 hover:text-red-700 dark:text-red-400"
            >
              <ChevronLeft size={16} />
              Cancel Item
            </Button>
          )}
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
            Customize {parentItem.name}
          </span>
        </div>
        
        <div className="flex gap-1 text-[10px] font-bold text-brand-600">
          Step {currentStepIndex + 1} of {itemModifierGroups.length}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-3 lg:p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {group?.name || `Group ${currentSlot.modifiersGroupId}`}
          </h3>
          <div className="text-sm font-semibold">
            {isForced ? (
              <span className={currentCount === maxChoices ? "text-green-600" : "text-amber-600"}>
                {currentCount} / {maxChoices} Selected
              </span>
            ) : (
              <span className="text-brand-600">Optional (Multiple)</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 lg:gap-3 overflow-y-auto custom-scrollbar">
          {items.map((mod) => {
            const isSelected = !!selectedModifiers[mod.id];
            const isLimitReached = isForced && currentCount >= maxChoices && !isSelected;

            return (
              <div
                key={mod.id}
                onClick={() => handleToggle(mod.id)}
                className={`relative cursor-pointer rounded-xl border-2 transition-all p-3 min-h-[5rem] flex flex-col items-center justify-center text-center ${
                  isSelected
                    ? "bg-brand-50 border-brand-500 text-brand-900 dark:bg-brand-500/20 dark:border-brand-500 dark:text-white shadow-md"
                    : isLimitReached
                      ? "bg-gray-50 border-transparent opacity-40 cursor-not-allowed dark:bg-white/[0.02]"
                      : "bg-gray-50 border-transparent hover:border-gray-200 dark:bg-gray-700 dark:hover:border-gray-600"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-1 right-1 text-brand-600 dark:text-brand-400">
                    <CheckCircle2 size={16} fill="currentColor" className="text-white dark:text-gray-800" />
                  </div>
                )}
                <h4 className="text-sm lg:text-base font-bold leading-tight mb-1">
                  {mod.name}
                </h4>
                {mod.price > 0 && (
                  <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                    +{mod.price.toFixed(2)} EGP
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-auto pt-4 flex justify-end gap-2">
           {!isForced && (
             <Button size="lg" variant="default" onClick={handleNext}>
                {currentStepIndex < itemModifierGroups.length - 1 ? "Next Step" : "Add to Order"}
             </Button>
           )}
           {/* If forced, it auto-advances. But in case they want a manual skip or it's buggy, we could add a disabled Next button */}
           {isForced && (
             <Button size="lg" variant="default" disabled={currentCount !== maxChoices} onClick={handleNext}>
                {currentStepIndex < itemModifierGroups.length - 1 ? "Next Step" : "Add to Order"}
             </Button>
           )}
        </div>
      </div>
    </div>
  );
}
