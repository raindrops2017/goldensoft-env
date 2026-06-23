import { useEffect, useMemo } from "react";
import type { MenuType, MenuGroup } from "@goldensoft/core-schemas";
import { Coffee, Utensils, IceCream, Flame, LayoutGrid } from "lucide-react";

function getIconForType(name: string) {
  const n = name.toLowerCase();
  if (n.includes("food") || n.includes("kitchen")) return <Utensils size={18} />;
  if (n.includes("drink") || n.includes("bev") || n.includes("bar") || n.includes("coffee")) return <Coffee size={18} />;
  if (n.includes("dessert") || n.includes("sweet") || n.includes("cake")) return <IceCream size={18} />;
  if (n.includes("shisha")) return <Flame size={18} />;
  return <LayoutGrid size={18} />;
}

interface Props {
  activeKind: string;
  groups: MenuGroup[];
  types: MenuType[];
  onKindChange: (kind: string) => void;
}

export default function KindTabs({
  activeKind,
  groups,
  types,
  onKindChange,
}: Props) {

  const visibleTabs = useMemo(() => {
    return types.filter((tab) => {
      return groups.filter((g) => g.isActive === 1 && g.menuTypeId === tab.id).length > 0;
    });
  }, [types, groups]);

  const activeIndex = useMemo(() => {
    return visibleTabs.findIndex((t) => t.id === activeKind);
  }, [visibleTabs, activeKind]);

  useEffect(() => {
    if (
      visibleTabs.length > 0 &&
      !visibleTabs.some((t) => t.id === activeKind)
    ) {
      onKindChange(visibleTabs[0].id);
    }
  }, [visibleTabs, activeKind, onKindChange]);

  if (visibleTabs.length === 0) return null;

  return (
    <div className="shrink-0 bg-white pb-1 dark:bg-gray-800 lg:pb-2">
      <div className="relative flex w-full rounded-xl lg:rounded-2xl bg-gray-100 dark:bg-gray-900 p-1 shadow-inner">
        {/* Animated sliding pill */}
        <div
          className="absolute top-1 bottom-1 rounded-xl bg-white dark:bg-gray-700 shadow-md transition-all duration-300"
          style={{
            width: `${100 / visibleTabs.length}%`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />

        {visibleTabs.map((section) => {
          const isActive = activeKind === section.id;
          const count = groups.filter(
            (g) => g.isActive === 1 && g.menuTypeId === section.id,
          ).length;

          return (
            <button
              key={section.id}
              onClick={() => onKindChange(section.id)}
              className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 lg:gap-2 py-2 lg:py-3
                text-sm font-medium rounded-xl transition-colors
                ${isActive ? "text-brand-600 dark:text-brand-400" : "text-gray-600 dark:text-gray-400"}`}
            >
              <span className="flex items-center justify-center">
                {getIconForType(section.name)}
              </span>
              <span className="hidden sm:inline">{section.name}</span>
              <span
                className={`ml-1 flex h-5 min-w-[20px] items-center justify-center
                  rounded-full text-[10px] font-bold
                  ${isActive ? "bg-brand-500 text-white" : "bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300"}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
