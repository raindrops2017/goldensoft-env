import { useEffect, useMemo } from "react";
import { ItemGroupJson } from "@/interfaces/ItemGroupInterface";
import { useMenuKinds } from "@/hooks/useMenuKinds";

interface Props {
  branchId: number | string;
  activeKind: number;
  groups: ItemGroupJson[];
  onKindChange: (kind: number) => void;
}

export default function KindTabs({
  branchId,
  activeKind,
  groups,
  onKindChange,
}: Props) {
  const { menuKinds, isLoading } = useMenuKinds(branchId);

  const visibleTabs = useMemo(() => {
    return menuKinds.filter((tab) => {
      return groups.filter((g) => g.stut === 0 && g.kind === tab.code).length > 0;
    });
  }, [menuKinds, groups]);

  const activeIndex = useMemo(() => {
    return visibleTabs.findIndex((t) => t.code === activeKind);
  }, [visibleTabs, activeKind]);

  useEffect(() => {
    if (
      !isLoading &&
      visibleTabs.length > 0 &&
      !visibleTabs.some((t) => t.code === activeKind)
    ) {
      onKindChange(visibleTabs[0].code);
    }
  }, [visibleTabs, activeKind, onKindChange, isLoading]);

  if (isLoading || visibleTabs.length === 0) return null;

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
          const isActive = activeKind === section.code;
          const count = groups.filter(
            (g) => g.stut === 0 && g.kind === section.code,
          ).length;

          return (
            <button
              key={section.code}
              onClick={() => onKindChange(section.code)}
              className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 lg:gap-2 py-2 lg:py-3
                text-sm font-medium rounded-xl transition-colors
                ${isActive ? "text-brand-600 dark:text-brand-400" : "text-gray-600 dark:text-gray-400"}`}
            >
              <span className="flex items-center justify-center">
                {section.icon}
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
