import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag } from "lucide-react";
import { useBranch } from "@/context/BranchContext";
import { getOptions, type OptionsResponse } from "@/services/optionsApi";
import { ItemJson } from "@/interfaces/ItemInterface";
import type { ItemSubGroupJson } from "@/interfaces/ItemGroupInterface";
import { sendOrder } from "@/services/checksApi";
import { toast } from "sonner";
import { useItemsList } from "@/hooks/useItemsList";
import { useOrderSession } from "@/hooks/useOrderSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import KindTabs from "@/components/pos/KindTabs";
import MenuGrid from "@/components/pos/MenuGrid";
import { useSubItemGroups } from "@/hooks/useSubItemGroups";
import MenuFooter from "@/components/pos/MenuFooter";
import { CartSidebar } from "@/components/pos/CartPanel";
import DiscountDialog from "@/components/pos/DiscountDialog";
import PaymentDrawer from "@/components/pos/PaymentDrawer";
// import TakeawayChecksDialog from "@/components/pos/TakeawayChecksDialog";
import { ChkHead } from "@/types/check.types";
import TakeawayChecksDialog from "@/components/pos/TakeawayChecksDialog";
import { ModifierSelectionModal } from "@/components/pos/ModifierSelectionModal";
import type { PaymentFormData } from "@/components/pos/PaymentDrawer.types";

type SendOrderOverrides = Partial<Parameters<typeof sendOrder>[0]>;

export default function TakeawayOrder() {
  const { selectedBranch, currentDate } = useBranch();
  const selectedBranchId = selectedBranch?.id ?? null;

  const [activeKind, setActiveKind] = useState<number>(1);
  const [activeGroup, setActiveGroup] = useState<number | null>(null);
  const [activeSubGroup, setActiveSubGroup] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"groups" | "subGroups" | "items">(
    "groups",
  );

  const [discountOpen, setDiscountOpen] = useState(false);
  const [payDrawerOpen, setPayDrawerOpen] = useState(false);
  const [checksDialogOpen, setChecksDialogOpen] = useState(false);
  const [reopenedCheck, setReopenedCheck] = useState<ChkHead | undefined>(
    undefined,
  );
  const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "" });
  const [selectedParentItem, setSelectedParentItem] = useState<ItemJson | null>(
    null,
  );
  const [isModifierModalOpen, setIsModifierModalOpen] = useState(false);

  const { data: itemsRes, isLoading: itemsLoading } =
    useItemsList(selectedBranchId);
  const items = useMemo<ItemJson[]>(() => itemsRes ?? [], [itemsRes]);

  const { data: options } = useQuery<OptionsResponse | undefined>({
    queryKey: ["options", selectedBranchId],
    queryFn: getOptions,
    enabled: !!selectedBranchId,
  });

  const { data: subGroupsRes } = useSubItemGroups(
    selectedBranchId,
    activeGroup,
  );
  const subGroups = useMemo(() => {
    if (!subGroupsRes) return [];
    return subGroupsRes.filter((g: ItemSubGroupJson) => g.grp_stut !== 0);
  }, [subGroupsRes]);

  // Fix 3: Sync customer info when reopening a check
  useEffect(() => {
    if (!reopenedCheck) {
      setCustomerInfo({ name: "", phone: "" });
      return;
    }
    const raw = reopenedCheck.cust_notes ?? "";
    if (!raw) {
      setCustomerInfo({ name: "", phone: "" });
      return;
    }
    // Format saved as "Name - Phone"
    const idx = raw.indexOf(" - ");
    const name = idx !== -1 ? raw.slice(0, idx).trim() : raw.trim();
    const phone = idx !== -1 ? raw.slice(idx + 3).trim() : "";
    setCustomerInfo({ name, phone });
  }, [reopenedCheck]);

  const chkDateStr = currentDate.toISOString().split("T")[0];

  const session = useOrderSession({
    mode: "takeaway",
    chkDate: chkDateStr,
    chkKind: 3, // Takeaway
    initialCheck: reopenedCheck,
    options,
    tableNo: "0",
    onSuccess: () => setReopenedCheck(undefined),
  });

  const {
    localCart,
    subtotal,
    discountAmount,
    appliedDiscount,
    setAppliedDiscount,
    discKind,
    setDiscKind,
    discPrsn,
    setDiscPrsn,
    service,
    tax,
    total,
    handleAddItem,
    handleRemoveItem,
    handleChangeQty,
    handleCompItem,
    handleUpdateNotes,
    handleVoidItem,
    saveMutation,
  } = session;

  const groups = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      if (item.ItemsGroup) map.set(item.ItemsGroup.code, item.ItemsGroup);
    });
    return Array.from(map.values());
  }, [items]);

  const filteredGroups = groups.filter(
    (g) => g.stut === 0 && g.kind === activeKind,
  );

  const groupItems = useMemo(() => {
    if (viewMode === "subGroups") {
      return items.filter(
        (item) =>
          item.c_g === activeGroup && (!item.sub_c_g || item.sub_c_g === 0),
      );
    } else if (viewMode === "items") {
      return items.filter((item) => item.sub_c_g === activeSubGroup);
    }
    return [];
  }, [items, activeGroup, activeSubGroup, viewMode]);

  useEffect(() => {
    if (groups.length > 0 && !activeGroup) setActiveGroup(groups[0].code);
  }, [groups, activeGroup]);

  const checkInfo = {
    formattedDate: currentDate.toLocaleDateString("en-GB"),
    formattedTime: new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    checkNo: reopenedCheck?.chk_no ?? "New",
    tableNo: "0",
    tableName: "Takeaway",
    guestNo: 1,
    waiterName: "",
    cashierName: "Current User", // Should come from context if needed
    printCount: reopenedCheck?.print_no ?? 0,
  };

  const checkPrinted = (reopenedCheck?.print_no ?? 0) > 0;
  const isNewCheck = !reopenedCheck;

  const cartProps = {
    tableNo: "0",
    orderLoading: false,
    localCart,
    subtotal,
    discount: discountAmount,
    discountPrsn: discPrsn,
    tax,
    service,
    total,
    checkPrinted,
    isNewCheck,
    onVoidItem: handleVoidItem,
    onRemoveItem: handleRemoveItem,
    onChangeQty: handleChangeQty,
    onCompItem: handleCompItem,
    onUpdateNotes: handleUpdateNotes,
  };

  const handleSendToKitchen = () => {
    if (localCart.length === 0) {
      toast.error("No items to send");
      return;
    }
    const notes = [customerInfo.name, customerInfo.phone]
      .filter(Boolean)
      .join(" - ");
    saveMutation.mutate({
      cust_notes: notes || undefined,
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden lg:gap-3">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-black/20 p-2 backdrop-blur-md sm:p-2.5 lg:p-3">
        <div className="flex min-h-0 flex-1 items-stretch gap-2 overflow-hidden sm:gap-4">
          <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border border-white/10 bg-white/95 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#2a1445]/95 to-[#5b2178]/95 px-4 py-3 backdrop-blur-sm dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-pink-400/40 via-fuchsia-500/40 to-purple-700/50 p-2 text-white shadow-md shadow-purple-900/30">
                  <ShoppingBag size={24} strokeWidth={1.5} />
                </div>
                <h1 className="text-xl font-bold text-white">Takeaway</h1>
              </div>
              <Button
                variant="outline"
                className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                onClick={() => setChecksDialogOpen(true)}
              >
                Open Checks
              </Button>
            </div>

            <div className="min-h-0 shrink-0">
              <KindTabs
                branchId={selectedBranchId ?? ""}
                activeKind={activeKind}
                groups={groups}
                onKindChange={(kind) => {
                  setActiveKind(kind);
                  setViewMode("groups");
                }}
              />
            </div>

            <div className="min-h-0 overflow-y-auto overscroll-contain p-2 lg:p-3">
              <MenuGrid
                viewMode={viewMode}
                filteredGroups={filteredGroups}
                subGroups={subGroups}
                groupItems={groupItems}
                itemsLoading={itemsLoading}
                onGroupClick={(code) => {
                  setActiveGroup(code);
                  setViewMode("subGroups");
                }}
                onSubGroupClick={(code) => {
                  setActiveSubGroup(code);
                  setViewMode("items");
                }}
                onItemClick={(item) => {
                  const hasModifiers =
                    item.item_opt1 ||
                    item.item_opt2 ||
                    item.item_opt3 ||
                    item.item_opt4;
                  if (hasModifiers) {
                    setSelectedParentItem(item);
                    setIsModifierModalOpen(true);
                  } else {
                    handleAddItem(item);
                    toast.success(`${item.item} added`);
                  }
                }}
                onBack={() => {
                  if (viewMode === "items") setViewMode("subGroups");
                  else if (viewMode === "subGroups") setViewMode("groups");
                }}
              />
            </div>

            <div className="min-h-0 shrink-0">
              <MenuFooter
                isSending={saveMutation.isPending}
                isPrinting={false}
                discountPrsn={discPrsn}
                checkInfo={checkInfo}
                isNewCheck={isNewCheck}
                hasItems={localCart.length > 0}
                hideSplit
                hideExit
                onSend={handleSendToKitchen}
                onDiscount={() => setDiscountOpen(true)}
                onPrint={() => toast("Printing Takeaway...")}
                onPay={() => setPayDrawerOpen(true)}
                onVoid={() => toast("Voiding Takeaway...")}
                onSplit={() => toast("Split not implemented")}
              />
            </div>
          </div>

          <div className="hidden h-full min-h-0 w-96 max-w-full shrink-0 grid grid-rows-[auto_minmax(0,1fr)] gap-4 self-stretch lg:grid">
            <div className="shrink-0 space-y-3 rounded-2xl border border-white/10 bg-white/95 p-4 shadow-lg backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                Customer Info
              </h3>
              <div className="space-y-2">
                <Input
                  placeholder="Customer Name"
                  value={customerInfo.name}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, name: e.target.value })
                  }
                />
                <Input
                  placeholder="Phone Number"
                  value={customerInfo.phone}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, phone: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="h-full min-h-0 overflow-hidden">
              <CartSidebar {...cartProps} />
            </div>
          </div>
        </div>
      </div>

      <DiscountDialog
        open={discountOpen}
        onClose={() => setDiscountOpen(false)}
        options={options}
        subtotal={subtotal}
        currentDiscount={appliedDiscount}
        currentDiscKind={discKind}
        onApply={(value: number, kind: number, prsn: number) => {
          setAppliedDiscount(value);
          setDiscKind(kind);
          setDiscPrsn(prsn);
          setDiscountOpen(false);
        }}
        onCancel={() => setDiscountOpen(false)}
      />

      <PaymentDrawer
        isOpen={payDrawerOpen}
        onClose={() => setPayDrawerOpen(false)}
        checkTotal={total}
        tableNumber="0"
        items={localCart.map((item) => ({
          name: item.Item?.item || "Unknown",
          quantity: item.qty || 1,
          unitPrice: item.u_price || 0,
          note: item.notes,
        }))}
        tax={tax}
        onConfirm={(data: PaymentFormData) => {
          // Same logic as TableOrder for chkStut
          let chkStut = 1;
          const hasCash = data.cash > 0;
          const hasVisa = data.visaAmount > 0;
          const hasCL = data.clAmount > 0;
          if (data.isComp) chkStut = 7;
          else if (hasCash && !hasVisa && !hasCL) chkStut = 2;
          else if (!hasCash && hasVisa && !hasCL) chkStut = 3;
          else if (hasCL && !hasCash && !hasVisa) chkStut = 4;
          else if ([hasCash, hasVisa, hasCL].filter(Boolean).length > 1)
            chkStut = 6;

          const custNotes = [customerInfo.name, customerInfo.phone]
            .filter(Boolean)
            .join(" - ");
          const overrides: SendOrderOverrides = {
            chkStut: data.chkStut || chkStut,
            cash: data.cash,
            visa: data.visaAmount,
            credit: data.clAmount,
            paidValue: data.cash + data.visaAmount + data.clAmount,
            visa_no: data.visaNo,
            visa_code:
              data.cardType === "Visa"
                ? 1
                : data.cardType === "Mastercard"
                  ? 2
                  : data.cardType === "Amex"
                    ? 3
                    : 4,
            cust_code: data.customerId || undefined,
            ent: data.isComp ? subtotal : 0,
            cust_notes: custNotes || undefined,
            tax: data.tax !== undefined ? data.tax : tax,
            service: data.service !== undefined ? data.service : service,
            discount: data.discountAmount !== undefined ? data.discountAmount : discountAmount,
            disc_kind: data.discountPrsn ? 1 : discKind,
            discPrsn: data.discountPrsn !== undefined ? data.discountPrsn : discPrsn,
          };
          saveMutation.mutate(overrides);
          setPayDrawerOpen(false);
        }}
      />

      <TakeawayChecksDialog
        isOpen={checksDialogOpen}
        onClose={() => setChecksDialogOpen(false)}
        onSelect={(check: ChkHead) => {
          setReopenedCheck(check);
          setChecksDialogOpen(false);
        }}
      />

      {selectedParentItem && (
        <ModifierSelectionModal
          isOpen={isModifierModalOpen}
          onClose={() => setIsModifierModalOpen(false)}
          parentItem={selectedParentItem}
          onConfirm={(modifiers) => {
            handleAddItem(selectedParentItem);
            modifiers.forEach((m) => handleAddItem(m));
            setIsModifierModalOpen(false);
            toast.success(`${selectedParentItem.item} with modifiers added`);
          }}
        />
      )}
    </div>
  );
}
