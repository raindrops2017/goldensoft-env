import { Loader2, ChevronLeft, Grid, Layers } from "lucide-react";
import { ItemJson } from "@/interfaces/ItemInterface";
import { ItemGroupJson, ItemSubGroupJson } from "@/interfaces/ItemGroupInterface";
import Badge from "@/components/ui/badge/Badge";
import { Button } from "@/components/ui/button";

interface Props {
  viewMode: "groups" | "subGroups" | "items";
  filteredGroups: ItemGroupJson[];
  subGroups?: ItemSubGroupJson[];
  groupItems: ItemJson[];
  itemsLoading: boolean;
  onGroupClick: (code: number) => void;
  onSubGroupClick: (code: number) => void;
  onItemClick: (item: ItemJson) => void;
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
    <div className="flex flex-col gap-2">
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

      <div className="grid auto-rows-max grid-cols-4 content-start sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-1.5 lg:gap-2">
        {viewMode === "groups" &&
          filteredGroups.map((group) => (
            <div
              key={group.code}
              onClick={() => onGroupClick(group.code)}
              className="relative cursor-pointer rounded-lg lg:rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow p-1.5 lg:p-2 text-center"
            >
              <div className="absolute top-1 left-1 z-10">
                <Badge variant="light" color="primary" size="sm" className="w-6 h-6 p-0 rounded-md">
                  <Grid size={12} />
                </Badge>
              </div>
              <div className="h-10 lg:h-12 w-full rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden mb-0.5 lg:mb-1">
                <img
                  src="/images/items/item1.png"
                  alt={group.item_group_name}
                  className="h-full w-full object-contain"
                />
              </div>
              <h4 className="text-[10px] lg:text-[11px] font-medium truncat text-black dark:text-white">
                {group.item_group_name}
              </h4>
            </div>
          ))}

        {viewMode === "subGroups" && (
          <>
            {subGroups.map((sub) => (
              <div
                key={`sub-${sub.sub_code}`}
                onClick={() => onSubGroupClick(sub.sub_code)}
                className="relative cursor-pointer rounded-lg lg:rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow p-1.5 lg:p-2 text-center"
              >
                <div className="absolute top-1 left-1 z-10">
                  <Badge variant="light" color="warning" size="sm" className="w-6 h-6 p-0 rounded-md">
                    <Layers size={12} />
                  </Badge>
                </div>
                <div className="h-10 lg:h-12 w-full rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden mb-0.5 lg:mb-1">
                  <img
                    src="/images/items/item1.png"
                    alt={sub.sub_group_name}
                    className="h-full w-full object-contain"
                  />
                </div>
                <h4 className="text-[10px] lg:text-[11px] font-medium truncate text-black dark:text-white">
                  {sub.sub_group_name}
                </h4>
              </div>
            ))}
            {groupItems.map((item) => (
              <div
                key={item.code}
                onClick={() => onItemClick(item)}
                className="cursor-pointer rounded-lg lg:rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow p-1.5 lg:p-2 text-center"
              >
                <div className="h-12 lg:h-14 w-full rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden mb-0.5 lg:mb-1">
                  <img
                    src="/images/items/item1.png"
                    alt={item.item}
                    className="h-full w-full object-contain"
                  />
                </div>
                <h4 className="text-[10px] lg:text-[11px] font-medium truncate text-black dark:text-white">
                  {item.item}
                </h4>
                <p className="text-[9px] lg:text-[10px] text-gray-500 dark:text-gray-400">
                  {item.sale_price} EGP
                </p>
              </div>
            ))}
          </>
        )}

        {viewMode === "items" &&
          groupItems.map((item) => (
            <div
              key={item.code}
              onClick={() => onItemClick(item)}
              className="cursor-pointer rounded-lg lg:rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow p-1.5 lg:p-2 text-center"
            >
              <div className="h-12 lg:h-14 w-full rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden mb-0.5 lg:mb-1">
                <img
                  src="/images/items/item1.png"
                  alt={item.item}
                  className="h-full w-full object-contain"
                />
              </div>
              <h4 className="text-[10px] lg:text-[11px] font-medium truncate text-black dark:text-white">
                {item.item}
              </h4>
              <p className="text-[9px] lg:text-[10px] text-gray-500 dark:text-gray-400">
                {item.sale_price} EGP
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}
