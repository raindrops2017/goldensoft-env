import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { ShoppingCart } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import type { MenuItem } from "@goldensoft/core-schemas";
import { toast } from "sonner";
import { SplitCheckDialog } from "@/components/pos/SplitCheckDialog";

import KindTabs from "@/components/pos/KindTabs";
import MenuGrid from "@/components/pos/MenuGrid";
import MenuFooter from "@/components/pos/MenuFooter";
import { CartSidebar, CartBottomSheet } from "@/components/pos/CartPanel";
import DiscountDialog from "@/components/pos/DiscountDialog";
import PaymentDrawer from "@/components/pos/PaymentDrawer";
import { VoidReasonDialog } from "@/components/pos/VoidReasonDialog";
import { useChecksApi, useOpenChecks, useCheck } from "@/hooks/api/useChecksApi";
import { useTableSections } from "@/hooks/useTables";
import { useMenuApi } from "@/hooks/api/useMenuApi";
import ModifierGrid from "@/components/pos/ModifierGrid";
import { useOrderSession } from "@/hooks/pos/useOrderSession";
import { useLanSocket } from "@/hooks/useLanSocket";
import { useCurrentShift } from "@/hooks/api/useShiftApi";
import { PERMISSIONS } from "@goldensoft/core-schemas";
import { usePermissions } from "@/hooks/usePermissions";
import { SupervisorOverrideDialog } from "@/components/pos/SupervisorOverrideDialog";

export default function TableOrder() {
  const { tableNo } = useParams<{ tableNo: string }>();
  const user = useAuthStore(state => state.user);
  const { acquireLock, releaseLock, sendKdsOrder, updateTableStatus } = useLanSocket();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { data: currentShift } = useCurrentShift();
  const { hasPermission } = usePermissions();

  const [activeKind, setActiveKind] = useState<string>("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activeSubGroup, setActiveSubGroup] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"groups" | "subGroups" | "items" | "modifiers">("groups");

  const [cartOpen, setCartOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [payDrawerOpen, setPayDrawerOpen] = useState(false);
  const [isVoidDialogOpen, setIsVoidDialogOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [supervisorOpen, setSupervisorOpen] = useState(false);
  const [supervisorError, setSupervisorError] = useState<string | null>(null);
  const [supervisorRequiredPerm, setSupervisorRequiredPerm] = useState<string>("check:print");
  const [selectedParentItem, setSelectedParentItem] = useState<MenuItem | null>(null);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);

  /* ── Queries ── */
  const checksApi = useChecksApi();
  const { data: openChecks, isLoading: orderLoading } = useOpenChecks();
  const { data: sections = [] } = useTableSections();
  
  const chkNoParam = searchParams.get("chkNo");
  const chkNo = chkNoParam ? Number(chkNoParam) : null;

  const activeTable = useMemo(() => {
    const num = Number(tableNo);
    for (const sec of sections) {
      const t = sec.tables.find((tbl) => tbl.number === num);
      if (t) return t;
    }
    return null;
  }, [sections, tableNo]);

  // Operational Table Lock lifecycle
  useEffect(() => {
    if (!activeTable?.id) return;
    let active = true;

    const tryLock = async () => {
      const locked = await acquireLock(activeTable.id);
      if (active && !locked) {
        navigate("/dine-in");
      }
    };

    tryLock();

    return () => {
      active = false;
      if (activeTable?.id) {
        releaseLock(activeTable.id);
      }
    };
  }, [activeTable?.id, acquireLock, releaseLock, navigate]);

  // Filter open checks for this table
  const tableChecks = openChecks?.filter(c => c.tableId === activeTable?.id) || [];
  const activeCheckHead = tableChecks.find(c => c.chkNo === chkNo) || tableChecks[0];
  
  const { data: fullCheck } = useCheck(activeCheckHead?.id || "", {
    enabled: !!activeCheckHead?.id
  });

  const { data: menuData, isLoading: itemsLoading } = useMenuApi();
  const items = menuData?.items || [];
  const groupsAll = menuData?.groups || [];
  const subGroupsAll = menuData?.subGroups || [];

  const { data: options } = useQuery({
    queryKey: ["options"],
    queryFn: async () => { 
      const res = await api.get('/options');
      return res.data.data;
    },
  });

  /* ── Session Hook ── */
  const session = useOrderSession({
    mode: "dining",
    tableId: tableNo,
    tableName: `Table ${tableNo}`,
    initialCheck: fullCheck,
    options: options as any,
  });

  const {
    localCart,
    totalItemsValue: subtotal,
    appliedDiscount,
    serviceCharge,
    tax,
    total,
    handleAddItem,
    handleVoidItem,
    handleEntItem,
    handleUpdateNotes,
    setAppliedDiscount,
    setDiscountPercent,
    discountPercent,
  } = session;

  /* ── Derived ── */
  const filteredGroups = useMemo(() => {
    return groupsAll.filter(g => g.isActive === 1 && g.menuTypeId === activeKind);
  }, [groupsAll, activeKind]);

  const groupItems = useMemo(() => {
    if (viewMode === "subGroups") {
      return items.filter(item => item.menuGroupId === activeGroup && !item.menuSubGroupId);
    } else if (viewMode === "items") {
      return items.filter(item => item.menuSubGroupId === activeSubGroup);
    }
    return [];
  }, [items, activeGroup, activeSubGroup, viewMode]);

  const subGroupsForActiveGroup = useMemo(() => {
    return subGroupsAll.filter(sg => sg.menuGroupId === activeGroup && sg.isActive);
  }, [subGroupsAll, activeGroup]);

  /* ── Auto-select first group ── */
  useEffect(() => {
    if (filteredGroups.length > 0 && !activeGroup) {
      setActiveGroup(filteredGroups[0].id);
    }
  }, [filteredGroups, activeGroup]);

  /* ── Check info ── */
  const checkInfo = {
    formattedDate: new Date(fullCheck?.chkDate || currentShift?.businessDate).toLocaleDateString("en-GB"),
    formattedTime: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    checkNo: fullCheck?.chkNo ?? "N/A",
    tableNo,
    tableName: fullCheck?.tableName ?? `Table ${tableNo}`,
    guestNo: fullCheck?.guestCount ?? 1,
    waiterName: user?.username ?? "",
    cashierName: user?.username ?? "",
    printCount: fullCheck?.printCount ?? 0,
  };

  const checkPrinted = (fullCheck?.printCount ?? 0) > 0;

  /* ── Shared cart props ── */
  const cartProps = {
    tableNo,
    orderLoading,
    localCart,
    subtotal,
    discount: appliedDiscount,
    discountPrsn: discountPercent,
    tax,
    service: serviceCharge,
    total,
    checkPrinted,
    onVoidItem: (itemId: string, voidQty: number, reasonId: number) => {
       if (!fullCheck?.id) return;
       handleVoidItem(fullCheck.id, itemId, voidQty, reasonId);
    },
    onRemoveItem: (itemId: string) => {
       handleVoidItem('temp', itemId, 1, 1);
    },
    onChangeQty: (itemId: string, delta: number) => {
       const item = localCart.find(i => i.id === itemId || i.menuItemId === itemId);
       if (item) {
          session.handleChangeQty(item.id!, item.qty + delta);
       }
    },
    onCompItem: (itemId: string) => {
       if (!fullCheck?.id) return;
       handleEntItem(fullCheck.id, itemId, 1);
    },
    onUpdateNotes: (itemId: string, notes: string) => {
      handleUpdateNotes(itemId, notes);
    },
    menuItems: items,
  };

  /* ── Handlers ── */
  function handleVoidCheck() {
    if (!fullCheck?.id) {
      toast.error("Nothing to void");
      return;
    }
    setIsVoidDialogOpen(true);
  }

  function handleConfirmVoid(reasonId: number) {
    if (!fullCheck?.id) return;
    checksApi.voidCheck.mutate({ chkId: fullCheck.id, reasonId: reasonId.toString() }, {
      onSuccess: () => {
        setIsVoidDialogOpen(false);
        navigate("/dine-in");
      }
    });
  }

  const handleSend = async () => {
    const unsentItems = localCart.filter(i => i.id?.startsWith('temp-'));
    if (unsentItems.length === 0) {
      toast.error("No items to send");
      return;
    }
    
    if (!fullCheck?.id) {
      // Create new check
      checksApi.createCheck.mutate({
        checkKindId: 1, // Dining is 1
        tableId: activeTable?.id || undefined,
        tableName: activeTable?.name || `Table ${tableNo}`,
        guestCount: 1,
      }, {
        onSuccess: async (newCheck) => {
           // Add local items
           try {
             for (const item of unsentItems) {
                 await checksApi.addCheckItems.mutateAsync({
                    chkId: newCheck.id,
                    data: { menuItemId: item.menuItemId, qty: item.qty, notes: item.notes || undefined, modifiers: item.modifiers }
                 });
             }
             if (appliedDiscount > 0 || discountPercent > 0) {
               await checksApi.updateCheckDiscount.mutateAsync({
                 chkId: newCheck.id,
                 data: { discount: appliedDiscount, discountPercent }
               });
             }

             // Broadcast socket events to sync other tablets and KDS screens
             if (activeTable?.id) {
               await sendKdsOrder(newCheck.id, unsentItems);
               await updateTableStatus(activeTable.id, 'occupied', newCheck.chkNo);
             }

             toast.success("Order sent!");
             queryClient.invalidateQueries({ queryKey: ["checks"] });
             queryClient.invalidateQueries({ queryKey: ["openChecks"] });
             navigate("/dine-in");
           } catch (err: any) {
             toast.error(err.response?.data?.error || err.message || "Failed to add items to the new order");
           }
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.error || err.message || "Failed to create order");
        }
      });
    } else {
       // Append to existing check
       try {
         for (const item of unsentItems) {
             await checksApi.addCheckItems.mutateAsync({
                chkId: fullCheck.id,
                data: { menuItemId: item.menuItemId, qty: item.qty, notes: item.notes || undefined, modifiers: item.modifiers }
             });
         }

         // Broadcast socket events to sync other tablets and KDS screens
         if (activeTable?.id) {
           await sendKdsOrder(fullCheck.id, unsentItems);
           await updateTableStatus(activeTable.id, 'occupied', fullCheck.chkNo);
         }

         toast.success("Order sent!");
         queryClient.invalidateQueries({ queryKey: ["checks"] });
         queryClient.invalidateQueries({ queryKey: ["openChecks"] });
         queryClient.invalidateQueries({ queryKey: ["check", fullCheck.id] });
         navigate("/dine-in");
       } catch (err: any) {
         toast.error(err.response?.data?.error || err.message || "Failed to send items to the existing order");
       }
    }
  };



  const handlePrint = async (supervisorPinInput?: string | React.MouseEvent) => {
    const supervisorPin = typeof supervisorPinInput === "string" ? supervisorPinInput : undefined;
    if (!fullCheck) return;

    const isPrinted = (fullCheck.printCount || 0) > 0;
    const requiredPermission = isPrinted ? PERMISSIONS.CHECK_REPRINT : PERMISSIONS.CHECK_PRINT;
    const userHasPerm = hasPermission(requiredPermission);

    // Check if user has permission or supervisor PIN is provided
    if (!userHasPerm && !supervisorPin) {
      setSupervisorRequiredPerm(requiredPermission);
      setSupervisorError(null);
      setSupervisorOpen(true);
      return;
    }

    setIsPrinting(true);
    setSupervisorError(null);
    try {
      await checksApi.printCheck.mutateAsync({
        chkId: fullCheck.id,
        supervisorPin,
      });

      toast.success("Receipt printed successfully!");
      setSupervisorOpen(false);
      queryClient.invalidateQueries({ queryKey: ["openChecks"] });
      queryClient.invalidateQueries({ queryKey: ["check", fullCheck.id] });
      queryClient.invalidateQueries({ queryKey: ["tableSections"] });
      navigate("/dine-in");
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || "Failed to print check";
      if (supervisorPin) {
        setSupervisorError(errMsg);
      } else {
        toast.error(errMsg);
      }
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden min-h-0 gap-2 lg:gap-3 bg-slate-50 dark:bg-[#0a0510] p-2 lg:p-3">
      {/* Tab Switcher for Multiple Checks */}
      {tableChecks.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto shrink-0 select-none pb-1.5 scrollbar-thin">
          <span className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider px-2">
            Active Bills:
          </span>
          {tableChecks.map((chk) => {
            const isActive = chk.id === fullCheck?.id;
            return (
              <button
                key={chk.id}
                onClick={() => navigate(`/table/${tableNo}?chkNo=${chk.chkNo}`)}
                className={`h-11 px-4 rounded-xl font-extrabold active:scale-95 transition-all text-xs shrink-0 select-none cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30"
                    : "bg-white dark:bg-[#151120] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5"
                }`}
              >
                <span>Check #{chk.chkNo}</span>
                <span className="text-[10px] opacity-80">
                  ({(chk.total || 0).toFixed(0)} EGP)
                </span>
              </button>
            );
          })}

        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-black/20 p-2 backdrop-blur-md sm:p-2.5 lg:p-3">
        <div className="flex min-h-0 flex-1 items-stretch gap-2 overflow-hidden sm:gap-4">
          <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className={`min-h-0 shrink-0 ${viewMode === "modifiers" ? "pointer-events-none opacity-50" : ""}`}>
              <KindTabs
                activeKind={activeKind}
                groups={groupsAll}
                types={menuData?.types || []}
                onKindChange={(kind) => {
                  setActiveKind(kind);
                  setViewMode("groups");
                }}
              />
            </div>

            <div className="min-h-0 overflow-y-auto overscroll-contain p-2 lg:p-3">
              {viewMode === "modifiers" && selectedParentItem ? (
                <ModifierGrid
                  parentItem={selectedParentItem}
                  onConfirm={(modifiers) => {
                    handleAddItem(selectedParentItem as any, fullCheck?.id, modifiers);
                    toast.success(`${selectedParentItem.name} added to cart`, { duration: 1500 });
                    setViewMode(selectedParentItem.menuSubGroupId ? "items" : "subGroups");
                    setSelectedParentItem(null);
                  }}
                  onCancel={() => {
                    setViewMode(selectedParentItem.menuSubGroupId ? "items" : "subGroups");
                    setSelectedParentItem(null);
                  }}
                />
              ) : (
                <MenuGrid
                  viewMode={viewMode as any}
                  filteredGroups={filteredGroups as any}
                  subGroups={subGroupsForActiveGroup as any}
                  groupItems={groupItems as any}
                  itemsLoading={itemsLoading}
                  onGroupClick={(code: any) => {
                    setActiveGroup(String(code));
                    setViewMode("subGroups");
                  }}
                  onSubGroupClick={(code: any) => {
                    setActiveSubGroup(String(code));
                    setViewMode("items");
                  }}
                  onItemClick={(item) => {
                    if (item.modifiers && item.modifiers.length > 0) {
                      setSelectedParentItem(item as any);
                      setViewMode("modifiers");
                    } else {
                      handleAddItem(item as any, fullCheck?.id);
                      toast.success(`${item.name} added to cart`, { duration: 1500 });
                    }
                  }}
                  onBack={() => {
                    if (viewMode === "items") setViewMode("subGroups");
                    else if (viewMode === "subGroups") setViewMode("groups");
                  }}
                />
              )}
            </div>

            <div className="min-h-0 shrink-0">
              <MenuFooter
                isSending={false}
                isPrinting={isPrinting}
                discountPrsn={discountPercent}
                discountValue={appliedDiscount}
                checkInfo={checkInfo as any}
                isNewCheck={!fullCheck}
                hasItems={localCart.length > 0}
                onSend={handleSend}
                onDiscount={() => setDiscountOpen(true)}
                onPrint={() => handlePrint()}
                onPay={() => setPayDrawerOpen(true)}
                onVoid={handleVoidCheck}
                onSplit={() => setSplitDialogOpen(true)}
              />
            </div>
          </div>

          <div className="hidden h-full min-h-0 w-[300px] xl:w-96 max-w-full shrink-0 self-stretch lg:flex lg:flex-col">
            <CartSidebar {...cartProps as any} />
          </div>

          <button
            onClick={() => setCartOpen(true)}
            type="button"
            className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full border border-white/15 bg-gradient-to-r from-fuchsia-600 to-purple-700 px-4 py-3 text-white shadow-xl shadow-purple-900/50 transition hover:brightness-110 active:scale-[0.98] lg:hidden"
          >
            <ShoppingCart size={20} />
            <span className="text-sm font-semibold">{localCart.length} items</span>
            <span className="text-sm font-bold">· {total.toFixed(0)} EGP</span>
          </button>

          <div className="lg:hidden">
            <CartBottomSheet
              {...cartProps as any}
              isOpen={cartOpen}
              onClose={() => setCartOpen(false)}
            />
          </div>
        </div>
      </div>

      <DiscountDialog
        open={discountOpen}
        onClose={() => setDiscountOpen(false)}
        options={options}
        subtotal={subtotal}
        currentDiscount={appliedDiscount}
        currentDiscountPercent={discountPercent}
        onApply={async (value: number, percent: number) => {
          setAppliedDiscount(value);
          setDiscountPercent(percent);
          setDiscountOpen(false);
          if (fullCheck?.id) {
             await checksApi.updateCheckDiscount.mutateAsync({
               chkId: fullCheck.id,
               data: { discount: value, discountPercent: percent }
             });
             queryClient.invalidateQueries({ queryKey: ["check", fullCheck.id] });
          }
        }}
        onCancel={() => setDiscountOpen(false)}
      />

      <PaymentDrawer
        isOpen={payDrawerOpen}
        onClose={() => setPayDrawerOpen(false)}
        checkTotal={total}
        tableNumber={tableNo!}
        items={localCart.map((item) => {
          const itemDef = items.find((m) => m.id === item.menuItemId);
          const modifierTotal = item.modifiers?.reduce((sum, mod) => sum + (mod.price * mod.qty), 0) || 0;
          return {
            name: item.itemName || itemDef?.name || "Unknown Item",
            quantity: item.qty || 1,
            unitPrice: (item.itemPrice || 0) + modifierTotal,
            note: item.notes || undefined,
          };
        })}
        tax={tax}
        onConfirm={() => {
           toast("Payment handling to be implemented");
           setPayDrawerOpen(false);
        }}
      />

      <VoidReasonDialog
        open={isVoidDialogOpen}
        onOpenChange={setIsVoidDialogOpen}
        onConfirm={(reasonId: number) => {
           handleConfirmVoid(reasonId);
        }}
      />

      {splitDialogOpen && fullCheck && (
        <SplitCheckDialog
          open={splitDialogOpen}
          onClose={() => setSplitDialogOpen(false)}
          check={fullCheck}
          onSplitConfirm={async (payload) => {
            try {
              await checksApi.splitCheck.mutateAsync({
                chkId: fullCheck.id,
                data: payload as any
              });
              toast.success("Check split successfully!");
              setSplitDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ["openChecks"] });
              queryClient.invalidateQueries({ queryKey: ["checks"] });
              queryClient.invalidateQueries({ queryKey: ["check", fullCheck.id] });
              navigate("/dine-in");
            } catch (err: any) {
              toast.error(err.response?.data?.error || err.message || "Failed to split check");
            }
          }}
        />
      )}

      <SupervisorOverrideDialog
        open={supervisorOpen}
        onClose={() => setSupervisorOpen(false)}
        onSubmit={(pin) => handlePrint(pin)}
        isLoading={isPrinting}
        error={supervisorError}
        permissionRequired={supervisorRequiredPerm}
      />
    </div>
  );
}
