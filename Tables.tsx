import { useMemo, useState, useEffect, JSX, type FormEvent } from "react";
import PageMeta from "@/components/common/PageMeta";
import { useBranch } from "@/context/BranchContext";
import {
  TreesIcon,
  HomeIcon,
  UtensilsIcon,
  CircleCheckBigIcon,
  ClipboardListIcon,
} from "lucide-react";
import { Table } from "@/interfaces/TablesInterface";
import { Link, useNavigate } from "react-router-dom";
import FreeTable from "@/icons/Free-Table";
import OccTable from "@/icons/Occ-Table";
import PrintedTable from "@/icons/Printed-Table";
import { useBranchTables } from "@/hooks/useBranchTables";
import SplitedTable from "@/icons/Splited-Table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { createOnDemandTable } from "@/services/tablesApi";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";

const OPEN_TAB_CODE = -1;

const sectionIcons: Record<string, JSX.Element> = {
  "Out Door": <TreesIcon className="h-5 w-5" />,
  "In Door": <HomeIcon className="h-5 w-5" />,
  "In Door A": <HomeIcon className="h-5 w-5" />,
  "In Door B": <HomeIcon className="h-5 w-5" />,
  VIP: <CircleCheckBigIcon className="h-5 w-5" />,
  default: <UtensilsIcon className="h-5 w-5" />,
};

export default function Tables() {
  const [activeSection, setActiveSection] = useState<number | null>(null);
  const { selectedBranch } = useBranch();
  const selectedBranchId = selectedBranch?.id ?? null;
  const navigate = useNavigate();

  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [splitTable, setSplitTable] = useState<Table | null>(null);
  const [addTableOpen, setAddTableOpen] = useState(false);
  const [newTableNo, setNewTableNo] = useState("");
  const [newGuestNo, setNewGuestNo] = useState("1");
  const [isCreatingTable, setIsCreatingTable] = useState(false);
  const { can } = usePermission();
  const canAddOnDemandTable = can("orders.add_table_ondemand");
  const isOnDemandMode = selectedBranch?.table_mode === "on_demand";

  const { data: tablesLis, isLoading } = useBranchTables(
    selectedBranchId,
    selectedBranch?.table_mode,
  );

  const sections = useMemo(() => {
    if (!tablesLis) return [];
    const sectionMap = new Map<
      number,
      { code: number; name: string; count: number; icon: JSX.Element }
    >();
    tablesLis?.tabels.forEach((table: Table) => {
      if (table.Table_section) {
        const { id, Section_name } = table.Table_section;
        const icon = sectionIcons[Section_name] || sectionIcons.default;
        if (sectionMap.has(id)) {
          sectionMap.get(id)!.count += 1;
        } else {
          sectionMap.set(id, { code: id, name: Section_name, count: 1, icon });
        }
      }
    });
    return Array.from(sectionMap.values());
  }, [tablesLis]);

  useEffect(() => {
    if (isOnDemandMode && activeSection === null) {
      setActiveSection(OPEN_TAB_CODE);
      return;
    }
    if (sections.length > 0 && activeSection === null) {
      setActiveSection(sections[0].code);
    }
  }, [sections, activeSection, isOnDemandMode]);

  const getTableStatus = (table: Table) => {
    if (!table.ChkHeads?.length) return "empty";
    if (table.ChkHeads.length > 1) return "splited";

    const chk = table.ChkHeads[0];
    if (
      table.ChkHeads?.length === 1 &&
      chk.chk_stut === 1 &&
      chk.print_no > 0 &&
      chk.chk_date === tablesLis?.currentDate
    )
      return "printed";
    if (
      table.ChkHeads?.length === 1 &&
      chk.chk_stut === 1 &&
      chk.chk_date === tablesLis?.currentDate
    )
      return "occupied";
    return "empty";
  };

  const getChkStatus = (chk: Table["ChkHeads"][number]) => {
    if (
      chk.chk_stut === 1 &&
      chk.print_no > 0 &&
      chk.chk_date === tablesLis?.currentDate
    )
      return "printed";
    if (chk.chk_stut === 1 && chk.chk_date === tablesLis?.currentDate)
      return "occupied";
    return "empty";
  };

  // Status colors (shared by table cards + dialog cards)
  const statusConfig = {
    empty: {
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      border: "border-emerald-200 dark:border-emerald-500/20",
      icon: <FreeTable />,
      text: "text-emerald-600 dark:text-emerald-400",
      label: "Free",
    },
    occupied: {
      bg: "bg-amber-50 dark:bg-amber-500/10",
      border: "border-amber-200 dark:border-amber-500/20",
      icon: <OccTable />,
      text: "text-amber-600 dark:text-amber-400",
      label: "Occupied",
    },
    printed: {
      bg: "bg-fuchsia-50 dark:bg-fuchsia-500/10",
      border: "border-fuchsia-200 dark:border-fuchsia-500/20",
      icon: <PrintedTable />,
      text: "text-fuchsia-600 dark:text-fuchsia-400",
      label: "Printed",
    },
    splited: {
      bg: "bg-rose-50 dark:bg-rose-500/10",
      border: "border-rose-200 dark:border-rose-500/20",
      icon: <SplitedTable />,
      text: "text-rose-600 dark:text-rose-400",
      label: "Splited",
    },
  };

  const filteredTables = useMemo(() => {
    if (!tablesLis?.tabels || activeSection === null) return [];
    if (activeSection === OPEN_TAB_CODE) {
      return tablesLis?.tabels
        .filter(
          (table: Table) =>
            getTableStatus(table) === "occupied" ||
            getTableStatus(table) === "printed" ||
            getTableStatus(table) === "splited",
        )
        .sort((a: Table, b: Table) =>
          String(a.tabel_no).localeCompare(String(b.tabel_no), undefined, {
            numeric: true,
            sensitivity: "base",
          }),
        );
    }
    return tablesLis?.tabels
      .filter((table: Table) => table.Table_section?.id === activeSection)
      .sort((a: Table, b: Table) =>
        String(a.tabel_no).localeCompare(String(b.tabel_no), undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
  }, [tablesLis?.tabels, activeSection, tablesLis?.currentDate]);

  const handleCreateOnDemandTable = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId || !newTableNo.trim()) return;
    try {
      setIsCreatingTable(true);
      const guestNo = Number(newGuestNo);
      const result = await createOnDemandTable(selectedBranchId, {
        tableNo: newTableNo.trim(),
        guestNo: Number.isFinite(guestNo) && guestNo > 0 ? guestNo : 1,
        tableName: newTableNo.trim(),
      });
      const targetChkNo = result?.chkNo;
      setAddTableOpen(false);
      setNewTableNo("");
      setNewGuestNo("1");
      toast.success("Table opened");
      navigate(
        targetChkNo != null
          ? `/table/${encodeURIComponent(newTableNo.trim())}?chkNo=${targetChkNo}`
          : `/table/${encodeURIComponent(newTableNo.trim())}`,
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? "Failed to add table");
    } finally {
      setIsCreatingTable(false);
    }
  };

  return (
    <>
      <PageMeta title="Golden Soft | Dinning" description="Table overview" />

      <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-white/[0.03] sm:rounded-3xl sm:p-5 lg:p-6">
        {/* Tabs bar */}
        <div className="mb-4 flex flex-col gap-3 border-b border-gray-200 dark:border-gray-800 pb-4 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
          {/* Section tabs - left, scrollable on mobile */}
          <div className="-mx-1 flex min-w-0 overflow-x-auto pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {sections.map((section) => {
              const isActive = activeSection === section.code;
              return (
                <button
                  key={section.code}
                  onClick={() => setActiveSection(section.code)}
                  className={`
                    group relative flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all sm:gap-3 sm:px-4 sm:py-2.5
                    ${
                      isActive
                        ? "border border-brand-200 bg-brand-50 text-brand-600 shadow-sm dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400"
                        : "border border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                    }
                  `}
                >
                  <span
                    className={`
                      flex h-7 w-7 shrink-0 items-center justify-center rounded-full sm:h-8 sm:w-8
                      ${
                        isActive
                          ? "bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400"
                          : "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400"
                      }
                    `}
                  >
                    {section.icon}
                  </span>
                  <span>{section.name}</span>
                  <span
                    className={`
                      flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-bold
                      ${isActive ? "bg-brand-500 text-white" : "bg-gray-200 text-gray-700 dark:bg-white/20 dark:text-white"}
                    `}
                  >
                    {section.count}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Open Tables tab - right, full width on mobile */}
          <button
            onClick={() => setActiveSection(OPEN_TAB_CODE)}
            className={`
              group relative flex w-full shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all sm:w-auto sm:justify-start sm:gap-3 sm:px-4 sm:py-2.5
              ${
                activeSection === OPEN_TAB_CODE
                  ? "border border-brand-200 bg-brand-50 text-brand-600 shadow-sm dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400"
                  : "border border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
              }
            `}
          >
            <span
              className={`
                flex h-7 w-7 shrink-0 items-center justify-center rounded-full sm:h-8 sm:w-8
                ${
                  activeSection === OPEN_TAB_CODE
                    ? "bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400"
                    : "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400"
                }
              `}
            >
              <ClipboardListIcon className="h-5 w-5" />
            </span>
            <span>Open Tables</span>
            <span
              className={`
                flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-bold
                ${activeSection === OPEN_TAB_CODE ? "bg-brand-500 text-white" : "bg-gray-200 text-gray-700 dark:bg-white/20 dark:text-white"}
              `}
            >
              {tablesLis?.tabels?.filter(
                (t: Table) =>
                  getTableStatus(t) === "occupied" ||
                  getTableStatus(t) === "printed" ||
                  getTableStatus(t) === "splited",
              ).length ?? 0}
            </span>
          </button>
          {isOnDemandMode && canAddOnDemandTable && (
            <Button
              onClick={() => setAddTableOpen(true)}
              className="w-full border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 sm:w-auto"
            >
              Add Table
            </Button>
          )}
        </div>

        {/* Table cards grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
          {isLoading &&
            Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="h-24 w-full animate-pulse rounded-xl bg-gray-100 dark:bg-white/5"
              />
            ))}

          {!isLoading &&
            filteredTables?.map((table: Table) => {
              const status = getTableStatus(table);

              const config = statusConfig[status];

              return (
                <Link
                  key={table.tabel_no}
                  to={`/table/${encodeURIComponent(String(table.tabel_no))}`}
                  onClick={(e) => {
                    if (status !== "splited") return;
                    e.preventDefault();
                    setSplitTable(table);
                    setSplitDialogOpen(true);
                  }}
                >
                  <div
                    className={`
                    group relative flex flex-col items-center justify-center rounded-xl border p-3 backdrop-blur-sm
                    transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-brand-500/20 cursor-pointer hover:border-brand-300 dark:hover:border-brand-500/50
                    ${config.bg} ${config.border}
                  `}
                    style={{ aspectRatio: "1/1" }}
                  >
                    <span className="mb-1 text-3xl">{config.icon}</span>

                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {table.tabel_no}
                    </span>

                    <span
                      className={`text-[10px] font-medium uppercase ${config.text}`}
                    >
                      {config.label}
                    </span>

                    <span className="inline-block h-5 max-w-full truncate text-sm font-medium text-gray-600 dark:text-white/80">
                      {table.ChkHeads?.[0]?.table_name}
                    </span>

                    {/* نقطة نبض للحالات غير الفارغة (اختياري) */}
                    {status !== "empty" && (
                      <span className="absolute top-1 right-1 flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400/50"></span>
                        <span className="absolute inline-flex h-1.5 w-1.5 rounded-full bg-rose-500 top-0.5 right-0.5"></span>
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
        </div>

        {/* حالة عدم وجود طاولات */}
        {!isLoading && (filteredTables?.length ?? 0) === 0 && (
          <div className="mt-12 text-center sm:mt-16">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-4xl dark:border-gray-800 dark:bg-white/5">
              🍽️
            </div>
            <p className="mt-3 text-sm text-gray-500 dark:text-white/70 sm:text-base">
              {activeSection === OPEN_TAB_CODE
                ? "No open or printed tables"
                : "No tables in this section"}
            </p>
          </div>
        )}
      </div>

      <Dialog
        open={splitDialogOpen}
        onOpenChange={(open) => {
          setSplitDialogOpen(open);
          if (!open) setSplitTable(null);
        }}
      >
        <DialogContent className="max-w-lg border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white lg:max-h-[90vh] lg:max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Split table checks</DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              {splitTable
                ? `Table ${splitTable.tabel_no} has multiple checks. Choose one.`
                : "Choose a check."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4">
            {(splitTable?.ChkHeads ?? []).map((chk, i) =>
              (() => {
                const status = getChkStatus(chk);
                const config = statusConfig[status];
                return (
                  <button
                    key={chk.chk_no ?? i}
                    type="button"
                    onClick={() => {
                      const chkNo = chk.chk_no;
                      setSplitDialogOpen(false);
                      setSplitTable(null);
                      navigate(
                        chkNo != null
                          ? `/table/${encodeURIComponent(String(splitTable?.tabel_no ?? ""))}?chkNo=${chkNo}`
                          : `/table/${encodeURIComponent(String(splitTable?.tabel_no ?? ""))}`,
                      );
                    }}
                    style={{ aspectRatio: "1/1" }}
                  >
                    <div
                      className={`
                    group relative flex flex-col items-center justify-center rounded-xl border p-3 backdrop-blur-sm
                    transition-all duration-200 hover:scale-[1.02] hover:shadow-lg cursor-pointer hover:border-brand-300 dark:hover:border-brand-500/50
                    ${config.bg} ${config.border}
                  `}
                      style={{ aspectRatio: "1/1" }}
                    >
                      <span className="mb-1 text-3xl">{config.icon}</span>

                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        #{chk.chk_no ?? i + 1}
                      </span>

                      <span
                        className={`text-[10px] font-medium uppercase ${config.text}`}
                      >
                        {config.label}
                      </span>

                      <span className="inline-block h-5 max-w-full truncate text-sm font-medium text-gray-600 dark:text-white/80">
                        {chk.table_name}
                      </span>

                      {status !== "empty" && (
                        <span className="absolute top-1 right-1 flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400/50"></span>
                          <span className="absolute inline-flex h-1.5 w-1.5 rounded-full bg-rose-500 top-0.5 right-0.5"></span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })(),
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addTableOpen} onOpenChange={setAddTableOpen}>
        <DialogContent className="max-w-md border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              Add On-demand Table
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Create a table and open its check immediately.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateOnDemandTable} className="space-y-4">
            <div className="space-y-1">
              <Label>Table Number / Name</Label>
              <Input
                value={newTableNo}
                onChange={(e) => setNewTableNo(e.target.value)}
                placeholder="A1 or Terrace-5"
              />
            </div>
            <div className="space-y-1">
              <Label>Guests</Label>
              <Input
                type="number"
                min={1}
                value={newGuestNo}
                onChange={(e) => setNewGuestNo(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddTableOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingTable || !newTableNo.trim()}
              >
                {isCreatingTable ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
