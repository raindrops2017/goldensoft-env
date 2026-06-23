import { useState, useMemo, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ShoppingBag } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import type { MenuItem } from "@goldensoft/core-schemas";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import KindTabs from "@/components/pos/KindTabs";
import MenuGrid from "@/components/pos/MenuGrid";
import MenuFooter from "@/components/pos/MenuFooter";
import { CartSidebar } from "@/components/pos/CartPanel";
import DiscountDialog from "@/components/pos/DiscountDialog";
import PaymentDrawer from "@/components/pos/PaymentDrawer";
import TakeawayChecksDialog from "@/components/pos/TakeawayChecksDialog";
import ModifierGrid from "@/components/pos/ModifierGrid";
import { useChecksApi, useOpenChecks, useCheck } from "@/hooks/api/useChecksApi";
import { useMenuApi } from "@/hooks/api/useMenuApi";
import { useOrderSession } from "@/hooks/pos/useOrderSession";

export default function TakeawayOrder() {
  const user = useAuthStore(state => state.user);
  const queryClient = useQueryClient();

  const [activeKind, setActiveKind] = useState<string>("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activeSubGroup, setActiveSubGroup] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"groups" | "subGroups" | "items" | "modifiers">("groups");

  const [isPrinting] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [payDrawerOpen, setPayDrawerOpen] = useState(false);
  const [checksDialogOpen, setChecksDialogOpen] = useState(false);
  const [reopenedCheckId, setReopenedCheckId] = useState<string | undefined>(undefined);
  const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "" });
  const [selectedParentItem, setSelectedParentItem] = useState<MenuItem | null>(null);

  /* ── Queries ── */
  const checksApi = useChecksApi();
  const { data: openChecks, isLoading: orderLoading } = useOpenChecks();
  
  const { data: fullCheck } = useCheck(reopenedCheckId || "", {
    enabled: !!reopenedCheckId
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

  // Sync customer info when reopening a check
  useEffect(() => {
    if (!fullCheck) {
      setCustomerInfo({ name: "", phone: "" });
      return;
    }
    const name = fullCheck.customerId || ""; // Mapped from cust_notes later
    setCustomerInfo({ name, phone: "" });
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
    total,
    handleAddItem,
    handleVoidItem,
    handleEntItem,
    handleUpdateNotes,
    setAppliedDiscount,
    setDiscountPercent,
    discountPercent,
  } = session;

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

  useEffect(() => {
    if (filteredGroups.length > 0 && !activeGroup) {
      setActiveGroup(filteredGroups[0].id);
    }
  }, [filteredGroups, activeGroup]);

  const checkInfo = {
    formattedDate: new Date().toLocaleDateString("en-GB"),
    formattedTime: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    checkNo: fullCheck?.chkNo ?? "N/A",
    tableNo: "Takeaway",
    tableName: "Takeaway",
    guestNo: 1,
    waiterName: user?.username ?? "",
    cashierName: user?.username ?? "",
    printCount: fullCheck?.printCount ?? 0,
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
    service: serviceCharge,
    total,
    checkPrinted,
    onVoidItem: (itemId: string, voidQty: number, reasonId: number) => {
       if (!fullCheck?.id) return;
       handleVoidItem(fullCheck.id, itemId, voidQty, reasonId);
    },
    onRemoveItem: () => {
       handleVoidItem('temp', 'dummy', 1, 1);
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

  const handleSend = async () => {
    const unsentItems = localCart.filter(i => i.id?.startsWith('temp-'));
    if (unsentItems.length === 0) {
      toast.error("No items to send");
      return;
    }
    
    if (!fullCheck?.id) {
      checksApi.createCheck.mutate({
        checkKindId: 3,
        tableId: undefined,
        tableName: undefined,
        guestCount: 1,
      }, {
        onSuccess: async (newCheck) => {
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
           toast.success("Order sent!");
           queryClient.invalidateQueries({ queryKey: ["openChecks"] });
           setReopenedCheckId(undefined);
        }
      });
    } else {
       // Append to existing check
       for (const item of unsentItems) {
           await checksApi.addCheckItems.mutateAsync({
              chkId: fullCheck.id,
              data: { menuItemId: item.menuItemId, qty: item.qty, notes: item.notes || undefined, modifiers: item.modifiers }
           });
       }
       toast.success("Order sent!");
       queryClient.invalidateQueries({ queryKey: ["openChecks"] });
       queryClient.invalidateQueries({ queryKey: ["check", fullCheck.id] });
    }
  };

  const handlePrint = () => {
    toast("Printing not fully implemented");
  };

  const takeawayChecks = openChecks?.filter(c => c.checkKindId === 3) || [];

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden min-h-0 gap-2 lg:gap-3 bg-slate-50 dark:bg-[#0a0510] p-2 lg:p-3">
      {/* Top action bar */}
      <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm dark:bg-gray-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-brand-600" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              Takeaway
            </h2>
          </div>
          <div className="flex items-center gap-2 border-l pl-4 dark:border-gray-700">
            <Input
              placeholder="Customer Name..."
              className="w-48 bg-gray-50 text-sm"
              value={customerInfo.name}
              onChange={(e) =>
                setCustomerInfo((prev) => ({ ...prev, name: e.target.value }))
              }
            />
            <Input
              placeholder="Phone Number..."
              className="w-40 bg-gray-50 text-sm"
              value={customerInfo.phone}
              onChange={(e) =>
                setCustomerInfo((prev) => ({ ...prev, phone: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="gap-2 border-brand-200 text-brand-700 hover:bg-brand-50"
            onClick={() => setChecksDialogOpen(true)}
          >
            Open Checks
            {takeawayChecks.length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-xs font-bold">
                {takeawayChecks.length}
              </span>
            )}
          </Button>
        </div>
      </div>

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
                onPrint={handlePrint}
                onPay={() => setPayDrawerOpen(true)}
                onVoid={() => toast("Void functionality to be implemented")}
                onSplit={() => toast("Split to be implemented")}
              />
            </div>
          </div>

          <div className="hidden h-full min-h-0 w-[300px] xl:w-96 max-w-full shrink-0 self-stretch lg:flex lg:flex-col">
            <CartSidebar {...cartProps as any} />
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
        tableNumber={"Takeaway"}
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

      <TakeawayChecksDialog
        isOpen={checksDialogOpen}
        onClose={() => setChecksDialogOpen(false)}
        checks={takeawayChecks as any}
        onSelect={(check: any) => {
           setReopenedCheckId(check.id);
           setChecksDialogOpen(false);
        }}
      />
    </div>
  );
}
