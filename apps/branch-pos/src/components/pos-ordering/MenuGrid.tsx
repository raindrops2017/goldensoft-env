import { Loader2, ChevronLeft } from "lucide-react";
import type { MenuItem, MenuGroup } from "@goldensoft/core-schemas";
import { Button } from "@/components/ui/button";

interface Props {
  viewMode: "groups" | "subGroups" | "items";
  filteredGroups: MenuGroup[];
  subGroups?: any[];
  groupItems: MenuItem[];
  itemsLoading: boolean;
  onGroupClick: (code: string) => void;
  onSubGroupClick: (code: string) => void;
  onItemClick: (item: MenuItem) => void;
  onBack: () => void;
}

export default function MenuGrid({
  viewMode,
  filteredGroups,
  subGroups = [],
  groupItems,
  itemsLoading,
  onGroupClick,
  onSubGroupClick,
  onItemClick,
  onBack,
}: Props) {
  if (itemsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 custom-scrollbar">
      {viewMode !== "groups" && (
        <div className="mb-1 flex shrink-0 items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="h-8 flex items-center gap-1 text-brand-600 dark:text-brand-400"
          >
            <ChevronLeft size={16} />
            Back
          </Button>
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
            {viewMode === "subGroups" ? "Select Sub Group" : "Select Item"}
          </span>
        </div>
      )}

      <div className="grid auto-rows-max grid-cols-4 content-start sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1.5 lg:gap-2">
        {viewMode === "groups" &&
          filteredGroups.map((group) => (
            <div
              key={group.id}
              onClick={() => onGroupClick(group.id)}
              className="relative cursor-pointer rounded-lg xl:rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow p-1.5 xl:p-2 text-center"
            >
              <div className="h-10 xl:h-12 w-full rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden mb-0.5 xl:mb-1">
                <img
                  src="/images/items/item1.png"
                  alt={group.name}
                  className="h-full w-full object-contain"
                />
              </div>
              <h4 className="text-[10px] xl:text-[11px] font-medium truncate text-black dark:text-white">
                {group.name}
              </h4>
            </div>
          ))}

        {viewMode === "subGroups" && (
          <>
            {subGroups.map((sub) => (
              <div
                key={`sub-${sub.id}`}
                onClick={() => onSubGroupClick(sub.id)}
                className="relative cursor-pointer rounded-lg xl:rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow p-1.5 xl:p-2 text-center"
              >
                <div className="h-10 xl:h-12 w-full rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden mb-0.5 xl:mb-1">
                  <img
                    src="/images/items/item1.png"
                    alt={sub.name}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="absolute top-1 right-1 bg-brand-500 text-white text-[8px] px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm font-bold">
                  Sub Group
                </div>
                <h4 className="text-[10px] xl:text-[11px] font-medium truncate text-black dark:text-white">
                  {sub.name}
                </h4>
              </div>
            ))}
            {groupItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onItemClick(item)}
                className="cursor-pointer rounded-lg xl:rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow p-1.5 xl:p-2 text-center"
              >
                <div className="h-10 xl:h-14 w-full rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden mb-0.5 xl:mb-1">
                  <img
                    src={item.image || "/images/items/item1.png"}
                    alt={item.name}
                    className="h-full w-full object-contain"
                  />
                </div>
                <h4 className="text-[10px] xl:text-[11px] font-medium truncate text-black dark:text-white">
                  {item.name}
                </h4>
                <p className="text-[9px] xl:text-[10px] text-gray-500 dark:text-gray-400">
                  {item.prices?.[0]?.diningPrice || 0} EGP
                </p>
              </div>
            ))}
          </>
        )}

        {viewMode === "items" &&
          groupItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onItemClick(item)}
              className="cursor-pointer rounded-lg xl:rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow p-1.5 xl:p-2 text-center"
            >
              <div className="h-10 xl:h-14 w-full rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden mb-0.5 xl:mb-1">
                <img
                  src={item.image || "/images/items/item1.png"}
                  alt={item.name}
                  className="h-full w-full object-contain"
                />
              </div>
              <h4 className="text-[10px] xl:text-[11px] font-medium truncate text-black dark:text-white">
                {item.name}
              </h4>
              <p className="text-[9px] xl:text-[10px] text-gray-500 dark:text-gray-400">
                {item.prices?.[0]?.diningPrice || 0} EGP
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}
