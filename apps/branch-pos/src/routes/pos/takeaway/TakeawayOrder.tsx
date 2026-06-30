import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Motorbike, PackageOpen, ShoppingBag, ShoppingCart, Utensils, Lock, X, Menu } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useLockStore } from "@/store/useLockStore";
import type { MenuItem } from "@goldensoft/core-schemas";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import KindTabs from "@/components/pos-ordering/KindTabs";
import MenuGrid from "@/components/pos-ordering/MenuGrid";
import MenuFooter from "@/components/pos-ordering/MenuFooter";
import { CartSidebar, CartBottomSheet } from "@/components/pos-ordering/CartPanel";
import DiscountDialog from "@/components/pos-ordering/DiscountDialog";
import PaymentDrawer from "@/components/pos-ordering/PaymentDrawer";
import TakeawayChecksDialog from "@/components/pos-ordering/TakeawayChecksDialog";
import ModifierGrid from "@/components/pos-ordering/ModifierGrid";
import { useLanSocket } from "@/hooks/useLanSocket";
import {
  useChecksApi,
  useOpenChecks,
  useCheck,
} from "@/hooks/api/useChecksApi";
import { useMenuApi } from "@/hooks/api/useMenuApi";
import { useOrderSession } from "@/hooks/pos/useOrderSession";
import { PERMISSIONS } from "@goldensoft/core-schemas";
import { usePermissions } from "@/hooks/usePermissions";
import { SupervisorOverrideDialog } from "@/components/pos-ordering/SupervisorOverrideDialog";
import { HasPermission } from "@/components/auth/HasPermission";

export default function TakeawayOrder() {
  const user = useAuthStore((state) => state.user);
  const lock = useLockStore((state) => state.lock);
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const { sendKdsOrder, logAction } = useLanSocket();

  const [activeKind, setActiveKind] = useState<string>("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activeSubGroup, setActiveSubGroup] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<
    "groups" | "subGroups" | "items" | "modifiers"
  >("groups");

  const [isPrinting, setIsPrinting] = useState(false);
  const [supervisorOpen, setSupervisorOpen] = useState(false);
  const [supervisorError, setSupervisorError] = useState<string | null>(null);
  const [supervisorRequiredPerm, setSupervisorRequiredPerm] =
    useState<string>("check:print");
  const [discountOpen, setDiscountOpen] = useState(false);
  const [payDrawerOpen, setPayDrawerOpen] = useState(false);
  const [checksDialogOpen, setChecksDialogOpen] = useState(false);
  const [reopenedCheckId, setReopenedCheckId] = useState<string | undefined>(
    undefined,
  );
  const [cartOpen, setCartOpen] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "" });
  const [selectedParentItem, setSelectedParentItem] = useState<MenuItem | null>(
    null,
  );
  const [supervisorAction, setSupervisorAction] = useState<((pin: string, supervisorId: string, supervisorUsername: string) => Promise<void>) | null>(null);
  const [supervisorLoading, setSupervisorLoading] = useState(false);
  const [activeDiscountSupervisor, setActiveDiscountSupervisor] = useState<{ pin?: string, id?: string, name?: string } | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ── Queries ── */
  const checksApi = useChecksApi();
  const { data: openChecks, isLoading: orderLoading } = useOpenChecks();

  const { data: fullCheck } = useCheck(reopenedCheckId || "", {
    enabled: !!reopenedCheckId,
  });

  const { data: menuData, isLoading: itemsLoading } = useMenuApi();
  const items = menuData?.items || [];
  const groupsAll = menuData?.groups || [];
  const subGroupsAll = menuData?.subGroups || [];

  const { data: options } = useQuery({
    queryKey: ["options"],
    queryFn: async () => {
      const res = await api.get("/options");
      return res.data.data;
    },
  });

  // Sync customer info when reopening a check
  useEffect(() => {
    if (!fullCheck) {
      setCustomerInfo({ name: "", phone: "" });
      return;
    }
    setCustomerInfo({
      name: fullCheck.customerName || "",
      phone: fullCheck.customerPhone || "",
    });
  }, [fullCheck]);

  const session = useOrderSession({
    mode: "takeaway",
    initialCheck: fullCheck,
    options: options as any,
  });

  const {
    localCart,
    totalItemsValue: subtotal,
    appliedDiscount,
    serviceCharge,
    tax,
    entTax,
    total,
    handleAddItem,
    handleVoidItem,
    handleEntItem,
    handleUpdateNotes,
    setAppliedDiscount,
    setDiscountPercent,
    discountPercent,
    clearCart,
    deliveryCharge,
  } = session;

  const filteredGroups = useMemo(() => {
    return groupsAll.filter(
      (g) => g.isActive === 1 && g.menuTypeId === activeKind,
    );
  }, [groupsAll, activeKind]);

  const groupItems = useMemo(() => {
    if (viewMode === "subGroups") {
      return items.filter(
        (item) => item.menuGroupId === activeGroup && !item.menuSubGroupId,
      );
    } else if (viewMode === "items") {
      return items.filter((item) => item.menuSubGroupId === activeSubGroup);
    }
    return [];
  }, [items, activeGroup, activeSubGroup, viewMode]);

  const subGroupsForActiveGroup = useMemo(() => {
    return subGroupsAll.filter(
      (sg) => sg.menuGroupId === activeGroup && sg.isActive,
    );
  }, [subGroupsAll, activeGroup]);

  useEffect(() => {
    if (filteredGroups.length > 0 && !activeGroup) {
      setActiveGroup(filteredGroups[0].id);
    }
  }, [filteredGroups, activeGroup]);

  const checkInfo = {
    formattedDate: new Date().toLocaleDateString("en-GB"),
    formattedTime: new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    checkNo: fullCheck?.chkNo ?? "N/A",
    tableNo: "Takeaway",
    tableName: "Takeaway",
    guestNo: 1,
    waiterName: user?.username ?? "",
    cashierName: user?.username ?? "",
    printCount: fullCheck?.printCount ?? 0,
    waiterId: fullCheck?.waiterId,
  };

  const checkPrinted = (fullCheck?.printCount ?? 0) > 0;

  const cartProps = {
    tableNo: "0",
    orderLoading,
    localCart,
    subtotal,
    discount: appliedDiscount,
    discountPrsn: discountPercent,
    tax,
    entTax,
    service: serviceCharge,
    total,
    checkPrinted,
    onVoidItem: (itemId: string, voidQty: number, reasonId: number) => {
      if (!fullCheck?.id) return;
      if (itemId.startsWith('temp-')) {
        handleVoidItem(fullCheck.id, itemId, voidQty, reasonId);
        return;
      }
      const isPrinted = (fullCheck.printCount || 0) > 0;
      const requiredPermission = isPrinted ? PERMISSIONS.CHECK_ITEM_PRINTED_VOID : PERMISSIONS.CHECK_ITEM_VOID;
      runWithPermission(requiredPermission, async (pin, svId) => {
        await handleVoidItem(fullCheck.id, itemId, voidQty, reasonId, pin, svId);
      });
    },
    onRemoveItem: () => {
      handleVoidItem("temp", "dummy", 1, 1);
    },
    onChangeQty: (itemId: string, delta: number) => {
      const item = localCart.find(
        (i) => i.id === itemId || i.menuItemId === itemId,
      );
      if (item) {
        session.handleChangeQty(item.id!, item.qty + delta);
      }
    },
    onCompItem: (itemId: string, qty: number = 1) => {
      if (!fullCheck?.id) return;
      const isPrinted = (fullCheck.printCount || 0) > 0;
      const requiredPermission = isPrinted ? PERMISSIONS.CHECK_PRINTED_ITEM_COMP : PERMISSIONS.CHECK_ITEM_COMP;
      runWithPermission(requiredPermission, async (pin, svId, svName) => {
        await handleEntItem(fullCheck.id, itemId, qty, pin, svId, svName);
      });
    },
    onUpdateNotes: (itemId: string, notes: string) => {
      handleUpdateNotes(itemId, notes);
    },
    menuItems: items,
    mode: "takeaway" as const,
    mood: "takeaway" as const,
  };

  const resetScreen = () => {
    clearCart();
    setCustomerInfo({ name: "", phone: "" });
    setReopenedCheckId(undefined);
    setViewMode("groups");
  };

  const sendOrder = async (): Promise<string | null> => {
    const unsentItems = localCart.filter((i) => i.id?.startsWith("temp-"));
    const isCustomerChanged = fullCheck && (
      customerInfo.name !== (fullCheck.customerName || "") ||
      customerInfo.phone !== (fullCheck.customerPhone || "")
    );

    if (unsentItems.length === 0 && !isCustomerChanged) {
      if (fullCheck?.id) {
        return fullCheck.id;
      }
      toast.error("No items or customer changes to send");
      return null;
    }

    let targetCheckId = fullCheck?.id;

    if (!targetCheckId) {
      // Create new check
      const newCheck = await checksApi.createCheck.mutateAsync({
        checkKindId: 3,
        tableId: undefined,
        tableName: undefined,
        guestCount: 1,
        customerName: customerInfo.name || undefined,
        customerPhone: customerInfo.phone || undefined,
      });
      targetCheckId = newCheck.id;

      for (const item of unsentItems) {
        await checksApi.addCheckItems.mutateAsync({
          chkId: targetCheckId,
          data: {
            menuItemId: item.menuItemId,
            qty: item.qty,
            notes: item.notes || undefined,
            modifiers: item.modifiers,
          },
        });
      }
      if (appliedDiscount > 0 || discountPercent > 0) {
        await checksApi.updateCheckDiscount.mutateAsync({
          chkId: targetCheckId,
          data: { discount: appliedDiscount, discountPercent },
        });
      }
    } else {
      // If customer info changed, update it
      if (isCustomerChanged) {
        await checksApi.updateCheckCustomerInfo.mutateAsync({
          chkId: targetCheckId,
          customerName: customerInfo.name || undefined,
          customerPhone: customerInfo.phone || undefined,
        });
      }

      // Append to existing check
      if (unsentItems.length > 0) {
        for (const item of unsentItems) {
          await checksApi.addCheckItems.mutateAsync({
            chkId: targetCheckId,
            data: {
              menuItemId: item.menuItemId,
              qty: item.qty,
              notes: item.notes || undefined,
              modifiers: item.modifiers,
            },
          });
        }
      }
    }

    queryClient.invalidateQueries({ queryKey: ["openChecks"] });
    return targetCheckId;
  };

  const handleSend = async () => {
    try {
      const checkId = await sendOrder();
      if (checkId) {
        toast.success("Order sent!");
        resetScreen();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || "Failed to send order");
    }
  };

  const runWithPermission = (requiredPermission: string, action: (pin?: string, supervisorId?: string, supervisorUsername?: string) => Promise<void>) => {
    if (hasPermission(requiredPermission)) {
      action();
    } else {
      setSupervisorRequiredPerm(requiredPermission);
      setSupervisorError(null);
      setSupervisorAction(() => async (pin: string, supervisorId: string, supervisorUsername: string) => {
        await action(pin, supervisorId, supervisorUsername);
      });
      setSupervisorOpen(true);
    }
  };

  const handleSupervisorSubmit = async (pin: string, supervisorId: string, supervisorUsername: string) => {
    setSupervisorError(null);
    setSupervisorLoading(true);
    try {
      if (supervisorAction) {
        await supervisorAction(pin, supervisorId, supervisorUsername);
      }
      setSupervisorOpen(false);
      setSupervisorAction(null);
    } catch (err: any) {
      setSupervisorError(err.response?.data?.error || err.message || "Authorization failed");
    } finally {
      setSupervisorLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!fullCheck && localCart.length === 0) {
      toast.error("No items to print");
      return;
    }

    const isPrinted = (fullCheck?.printCount || 0) > 0;
    const requiredPermission = isPrinted
      ? PERMISSIONS.CHECK_REPRINT
      : PERMISSIONS.CHECK_PRINT;

    runWithPermission(requiredPermission, async (pin, svId) => {
      setIsPrinting(true);
      try {
        const checkId = await sendOrder();
        if (!checkId) {
          setIsPrinting(false);
          return;
        }

        await checksApi.printCheck.mutateAsync({
          chkId: checkId,
          supervisorPin: pin,
          supervisorId: svId,
        });

        toast.success("Receipt printed successfully!");
        resetScreen();
      } catch (err: any) {
        throw err;
      } finally {
        setIsPrinting(false);
      }
    });
  };

  const takeawayChecks = openChecks?.filter((c) => c.checkKindId === 3) || [];

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden min-h-0 gap-2 lg:gap-3 bg-slate-50 dark:bg-[#0a0510] p-2 lg:p-3 transition-colors duration-300">
      {/* Top action bar */}
      <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm dark:bg-gray-800 transition-colors duration-300 gap-2">
        <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1 sm:flex-initial">
          <div className="flex items-center gap-1.5 shrink-0">
            <ShoppingBag className="h-5 w-5 text-brand-600" />
            <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 hidden xs:block">
              Takeaway
            </h2>
          </div>
          <div className="flex items-center gap-2 border-l pl-2 sm:pl-4 dark:border-gray-700 min-w-0 flex-1">
            <Input
              placeholder="Customer Name..."
              className="w-24 sm:w-48 bg-gray-50 text-sm"
              value={customerInfo.name}
              onChange={(e) =>
                setCustomerInfo((prev) => ({ ...prev, name: e.target.value }))
              }
            />
            <Input
              placeholder="Phone Number..."
              className="w-24 sm:w-40 bg-gray-50 text-sm"
              value={customerInfo.phone}
              onChange={(e) =>
                setCustomerInfo((prev) => ({ ...prev, phone: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Desktop Controls */}
          <div className="hidden lg:flex items-center gap-3">
            <HasPermission permission={PERMISSIONS.DELIVERY_OPEN}>
              <Button
                variant="outline"
                onClick={() => navigate("/delivery")}
                className="h-10 px-3 xl:px-5 rounded-2xl border-slate-200 dark:border-white/10 dark:bg-[#252036] text-sm font-bold active:scale-95 flex items-center justify-center gap-1.5"
                title="Delivery"
              >
                <Motorbike className="w-4 h-4" />
                <span className="hidden xl:inline">Delivery</span>
              </Button>
            </HasPermission>

            <HasPermission permission={PERMISSIONS.DINING_OPEN}>
              <Button
                variant="outline"
                onClick={() => navigate("/dine-in")}
                className="h-10 px-3 xl:px-5 rounded-2xl border-slate-200 dark:border-white/10 dark:bg-[#252036] text-sm font-bold active:scale-95 flex items-center justify-center gap-1.5"
                title="Dine-in"
              >
                <Utensils className="w-4 h-4" />
                <span className="hidden xl:inline">Dine-in</span>
              </Button>
            </HasPermission>

            <Button
              variant="outline"
              className="h-10 px-3 xl:px-5 rounded-2xl border-slate-200 dark:border-white/10 dark:bg-[#252036] text-sm font-bold active:scale-95 flex items-center justify-center gap-1.5"
              onClick={() => setChecksDialogOpen(true)}
              title="Opened Checks"
            >
              <PackageOpen className="w-4 h-4" />
              <span className="hidden xl:inline">Opened Checks</span>
              {takeawayChecks.length > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-xs font-bold">
                  {takeawayChecks.length}
                </span>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="h-10 px-3 xl:px-5 rounded-2xl border-slate-200 dark:border-white/10 dark:bg-[#252036] text-sm font-bold active:scale-95 flex items-center justify-center gap-1.5"
              title="Exit"
            >
              <X className="w-4 h-4" />
              <span className="hidden xl:inline">Exit</span>
            </Button>
          </div>

          {/* Mobile view Dropdown */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="h-10 w-10 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#252036] text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-[#211d31] flex items-center justify-center font-bold text-sm active:scale-95 duration-75 cursor-pointer"
                title="Menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#1c1829] border border-slate-200 dark:border-white/10 shadow-2xl z-50 overflow-hidden py-1">
                  <HasPermission permission={PERMISSIONS.DELIVERY_OPEN}>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/delivery");
                      }}
                      className="w-full h-16 px-5 flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 duration-75 transition-transform cursor-pointer"
                    >
                      <Motorbike className="w-5 h-5 text-brand-600" />
                      <span>Delivery</span>
                    </button>
                  </HasPermission>

                  <HasPermission permission={PERMISSIONS.DINING_OPEN}>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/dine-in");
                      }}
                      className="w-full h-16 px-5 flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 duration-75 transition-transform cursor-pointer"
                    >
                      <Utensils className="w-5 h-5 text-brand-600" />
                      <span>Dine-in</span>
                    </button>
                  </HasPermission>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setChecksDialogOpen(true);
                    }}
                    className="w-full h-16 px-5 flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 duration-75 transition-transform cursor-pointer"
                  >
                    <PackageOpen className="w-5 h-5 text-brand-600" />
                    <div className="flex items-center gap-2">
                      <span>Opened Checks</span>
                      {takeawayChecks.length > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[10px] font-extrabold">
                          {takeawayChecks.length}
                        </span>
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      if (user) {
                        lock(user);
                      }
                    }}
                    className="w-full h-16 px-5 flex items-center gap-3 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 active:scale-95 duration-75 transition-transform cursor-pointer"
                  >
                    <Lock className="w-5 h-5" />
                    <span>Lock Terminal</span>
                  </button>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="h-10 px-3 sm:px-4 rounded-2xl border-slate-200 dark:border-white/10 dark:bg-[#252036] text-sm font-bold active:scale-95 flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Exit</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-black/20 p-2 backdrop-blur-md sm:p-2.5 lg:p-3">
        <div className="flex min-h-0 flex-1 items-stretch gap-2 overflow-hidden sm:gap-4">
          <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 transition-colors duration-300">
            <div
              className={`min-h-0 shrink-0 ${viewMode === "modifiers" ? "pointer-events-none opacity-50" : ""}`}
            >
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

            <div className="min-h-0 overflow-y-auto custom-scrollbar overscroll-contain p-2 lg:p-3">
              {viewMode === "modifiers" && selectedParentItem ? (
                <ModifierGrid
                  parentItem={selectedParentItem}
                  onConfirm={(modifiers) => {
                    handleAddItem(
                      selectedParentItem as any,
                      fullCheck?.id,
                      modifiers,
                    );
                    toast.success(`${selectedParentItem.name} added to cart`, {
                      duration: 1500,
                    });
                    setViewMode(
                      selectedParentItem.menuSubGroupId ? "items" : "subGroups",
                    );
                    setSelectedParentItem(null);
                  }}
                  onCancel={() => {
                    setViewMode(
                      selectedParentItem.menuSubGroupId ? "items" : "subGroups",
                    );
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
                      toast.success(`${item.name} added to cart`, {
                        duration: 1500,
                      });
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
                onDiscount={() => {
                  if (!fullCheck?.id) {
                    setDiscountOpen(true);
                    return;
                  }
                  const isPrinted = (fullCheck.printCount || 0) > 0;
                  const requiredPermission = isPrinted ? PERMISSIONS.DISCOUNT_PRINTED_APPLY : PERMISSIONS.DISCOUNT_APPLY;
                  runWithPermission(requiredPermission, async (pin, svId) => {
                    setActiveDiscountSupervisor({ pin, id: svId });
                    setDiscountOpen(true);
                  });
                }}
                onPrint={() => handlePrint()}
                onPay={() => runWithPermission(PERMISSIONS.CHECK_CLOSE, async () => { setPayDrawerOpen(true); })}
                onVoid={() => toast("Void functionality to be implemented")}
                onSplit={() => toast("Split to be implemented")}
                mode="takeaway"
                mood="takeaway"
                hideSplit={true}
                onNewCheck={() => {
                  clearCart();
                  setReopenedCheckId(undefined);
                }}
              />
            </div>
          </div>

          <div className="hidden h-full min-h-0 w-[300px] xl:w-96 max-w-full shrink-0 self-stretch lg:flex lg:flex-col">
            <CartSidebar {...(cartProps as any)} />
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
              isOpen={cartOpen}
              onClose={() => setCartOpen(false)}
              {...(cartProps as any)}
              mode="takeaway"
              mood="takeaway"
            />
          </div>
        </div>
      </div>

      <DiscountDialog
        open={discountOpen}
        onClose={() => {
          setDiscountOpen(false);
          setActiveDiscountSupervisor(null);
        }}
        options={options}
        subtotal={subtotal}
        currentDiscount={appliedDiscount}
        currentDiscountPercent={discountPercent}
        onApply={async (value: number, percent: number) => {
          if (fullCheck?.id) {
            await checksApi.updateCheckDiscount.mutateAsync({
              chkId: fullCheck.id,
              data: { 
                discount: value, 
                discountPercent: percent, 
                supervisorPin: activeDiscountSupervisor?.pin, 
                supervisorId: activeDiscountSupervisor?.id 
              },
            });
            setAppliedDiscount(value);
            setDiscountPercent(percent);
            setDiscountOpen(false);
            setActiveDiscountSupervisor(null);
            queryClient.invalidateQueries({
              queryKey: ["check", fullCheck.id],
            });
          } else {
            setAppliedDiscount(value);
            setDiscountPercent(percent);
            setDiscountOpen(false);
          }
        }}
        onCancel={() => {
          setDiscountOpen(false);
          setActiveDiscountSupervisor(null);
        }}
      />

      <PaymentDrawer
        isOpen={payDrawerOpen}
        onClose={() => setPayDrawerOpen(false)}
        checkTotal={total}
        tableNumber={"Takeaway"}
        items={localCart.map((item) => {
          const itemDef = items.find((m) => m.id === item.menuItemId);
          const modifierTotal =
            item.modifiers?.reduce(
              (sum, mod) => sum + mod.price * mod.qty,
              0,
            ) || 0;
          return {
            name: item.itemName || itemDef?.name || "Unknown Item",
            quantity: item.qty || 1,
            unitPrice: (item.itemPrice || 0) + modifierTotal,
            note: item.notes || undefined,
            entQty: item.entQty || 0,
          };
        })}
        tax={tax}
        serviceCharge={serviceCharge}
        deliveryCharge={deliveryCharge}
        discountAmount={appliedDiscount}
        discountPrsn={discountPercent}
        printCount={fullCheck?.printCount ?? 0}
        onConfirm={async (data) => {
          try {
            const createdId = await sendOrder();
            if (!createdId) return;
            const checkId = createdId;
            const isNewCheck = !reopenedCheckId && !fullCheck?.id;

            // 2. Send to kitchen
            if (isNewCheck) {
              try {
                await sendKdsOrder(checkId, localCart);
              } catch (kdsErr) {
                console.error("Failed to send KDS order:", kdsErr);
                toast.error("Failed to send order to kitchen KDS");
              }
            } else {
              const unsentItems = localCart.filter((i) => i.id?.startsWith("temp-"));
              if (unsentItems.length > 0) {
                try {
                  await sendKdsOrder(checkId, unsentItems);
                } catch (kdsErr) {
                  console.error("Failed to send KDS order:", kdsErr);
                  toast.error("Failed to send order to kitchen KDS");
                }
              }
            }

            // 3. Save closed check (close check)
            await checksApi.closeCheck.mutateAsync({
              chkId: checkId,
              data
            });

            // 4. Print closed check copy
            try {
              await checksApi.printCheck.mutateAsync({
                chkId: checkId,
              });
            } catch (printErr) {
              console.error("Failed to print check copy:", printErr);
              toast.error("Failed to print check copy");
            }

            toast.success("Payment processed and check closed successfully");
            logAction(
              'CHECK_CLOSE',
              {
                checkId: checkId,
                paymentMethod: data.paymentMethod,
                cash: data.cash,
                visaAmount: data.visaAmount,
                clAmount: data.clAmount,
                tips: data.tips,
                isComp: data.isComp,
                discountAmount: data.discountAmount,
                discountPrsn: data.discountPrsn,
                customerId: data.customerId,
                customerName: data.customerName,
              },
              {
                tableNo: "Takeaway",
                checkId: checkId,
              }
            );
            queryClient.invalidateQueries({ queryKey: ["openChecks"] });
            setPayDrawerOpen(false);
            resetScreen();
          } catch (err: any) {
            toast.error(err.response?.data?.error || err.message || "Failed to process payment");
          }
        }}
      />

      <TakeawayChecksDialog
        isOpen={checksDialogOpen}
        onClose={() => setChecksDialogOpen(false)}
        checks={takeawayChecks as any}
        onSelect={(check: any) => {
          setReopenedCheckId(check.id);
          setChecksDialogOpen(false);
        }}
      />

      <SupervisorOverrideDialog
        open={supervisorOpen}
        onClose={() => {
          setSupervisorOpen(false);
          setSupervisorAction(null);
        }}
        onSubmit={handleSupervisorSubmit}
        isLoading={supervisorLoading}
        error={supervisorError}
        permissionRequired={supervisorRequiredPerm}
      />
    </div>
  );
}
