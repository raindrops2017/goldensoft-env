import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShoppingCart } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import { getOptions, type OptionsResponse } from "@/services/optionsApi";
import { ItemJson } from "@/interfaces/ItemInterface";
import type { ItemGroupJson } from "@/interfaces/ItemGroupInterface";
import type { ItemSubGroupJson } from "@/interfaces/ItemGroupInterface";
import type { ChkHead } from "@/types/check.types";
import { sendOrder } from "@/services/checksApi";
import { toast } from "sonner";
import { enqueuePrintJob } from "@/lib/printQueue";

import KindTabs from "@/components/pos/KindTabs";
import MenuGrid from "../../../components/pos/MenuGrid";
import { useSubItemGroups } from "@/hooks/useSubItemGroups";
import MenuFooter from "../../../components/pos/MenuFooter";
import {
  CartSidebar,
  CartBottomSheet,
} from "../../../components/pos/CartPanel";
import DiscountDialog from "../../../components/pos/DiscountDialog";
import PaymentDrawer from "../../../components/pos/PaymentDrawer";
import VoidReasonDialog from "../../../components/pos/VoidReasonDialog";
import { useItemsList } from "@/hooks/useItemsList";
import { useTablesOrder } from "@/hooks/useTablesOrder";
import { ModifierSelectionModal } from "@/components/pos/ModifierSelectionModal";
import type { PaymentFormData } from "@/components/pos/PaymentDrawer.types";

type VoidReasonId = 1 | 2 | 3 | 4;

type SendOrderOverrides = Partial<Parameters<typeof sendOrder>[0]>;

export interface CartItem {
  item_code: number;
  qty: number; // remaining active qty (original - voided)
  u_price: number;
  ent_item?: number; // original price for complimentary item (100% discount)
  notes?: string;
  Item: { item: string; pic_name: string };
  ser?: number; // exists only for items already saved in DB
  it_time?: string; // HH:MM:SS (stamped on first add; never overwritten)
  // Void metadata (optional)
  void_time?: string;
  voide_kind?: VoidReasonId;
  voide_name?: string;
  Void_Prmtion?: string;
  Void_Stuts?: string;
  void_qty?: number; // total voided qty
}

import { useOrderSession } from "@/hooks/useOrderSession";

export default function TableOrder() {
  const { tableNo } = useParams<{ tableNo: string }>();
  const { user } = useAuth();
  const { selectedBranch, currentDate } = useBranch();
  const selectedBranchId = selectedBranch?.id ?? null;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [activeKind, setActiveKind] = useState<number>(1);
  const [activeGroup, setActiveGroup] = useState<number | null>(null);
  const [activeSubGroup, setActiveSubGroup] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"groups" | "subGroups" | "items">(
    "groups",
  );

  const [cartOpen, setCartOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [payDrawerOpen, setPayDrawerOpen] = useState(false);
  const [isVoidDialogOpen, setIsVoidDialogOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [selectedParentItem, setSelectedParentItem] = useState<ItemJson | null>(
    null,
  );
  const [isModifierModalOpen, setIsModifierModalOpen] = useState(false);

  /* ── Queries ── */
  const { data: orderRes, isLoading: orderLoading } = useTablesOrder(
    selectedBranchId,
    tableNo,
    currentDate.toISOString().split("T")[0],
  );

  const chkNoParam = searchParams.get("chkNo");
  const chkNo = chkNoParam ? Number(chkNoParam) : null;

  const orderList = orderRes as ChkHead[] | undefined;
  const order: ChkHead | undefined =
    orderList && chkNo != null && !Number.isNaN(chkNo)
      ? (orderList.find((o) => o.chk_no === chkNo) ?? orderList[0])
      : orderList?.[0];

  const { data: itemsRes, isLoading: itemsLoading } =
    useItemsList(selectedBranchId);
  const items: ItemJson[] = itemsRes ?? [];

  const { data: options } = useQuery<OptionsResponse | undefined>({
    queryKey: ["options", selectedBranchId],
    queryFn: getOptions,
    enabled: selectedBranchId != null,
  });

  const { data: subGroupsRes } = useSubItemGroups(
    selectedBranchId,
    activeGroup,
  );
  const subGroups = useMemo(() => {
    if (!subGroupsRes) return [];
    return subGroupsRes.filter((g: ItemSubGroupJson) => g.grp_stut !== 0);
  }, [subGroupsRes]);

  const chkDateStr = currentDate.toISOString().split("T")[0];

  /* ── Session Hook ── */
  const session = useOrderSession({
    mode: "dining",
    tableNo: tableNo ?? "0",
    chkDate: chkDateStr,
    chkKind: 2, // Dining
    initialCheck: order,
    options,
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

  /* ── Derived ── */
  const groups = useMemo(() => {
    const map = new Map<number, ItemGroupJson>();
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

  /* ── Auto-select first group ── */
  useEffect(() => {
    if (groups.length > 0 && !activeGroup) setActiveGroup(groups[0].code);
  }, [groups, activeGroup]);

  /* ── Check info ── */
  const chkDateBase = order?.chk_date
    ? new Date(order.chk_date)
    : new Date(currentDate);
  const currentTime = order?.chk_time
    ? new Date(`1970-01-01T${order.chk_time}Z`)
    : new Date();

  const checkInfo = {
    formattedDate: chkDateBase.toLocaleDateString("en-GB"),
    formattedTime: currentTime.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    checkNo: order?.chk_no ?? "N/A",
    tableNo,
    tableName: order?.table_name ?? `Table ${tableNo}`,
    guestNo: order?.gust_no ?? 1,
    waiterName: order?.waiter ?? "",
    cashierName: order?.cashier?.name ?? user?.name ?? "Test User",
    printCount: order?.print_no ?? 0,
  };

  const checkPrinted = (order?.print_no ?? 0) > 0;

  /* ── Shared cart props ── */
  const cartProps = {
    tableNo,
    orderLoading,
    localCart,
    subtotal,
    discount: discountAmount,
    discountPrsn: discPrsn,
    tax,
    service,
    total,
    checkPrinted,
    onVoidItem: (
      itemCode: number,
      voidQty: number,
      reasonId: VoidReasonId,
      reasonName: string,
    ) => handleVoidItem(itemCode, voidQty, reasonId, reasonName),
    onRemoveItem: (itemCode: number) => handleRemoveItem(itemCode),
    onChangeQty: (itemCode: number, delta: number) =>
      handleChangeQty(itemCode, delta),
    onCompItem: (itemCode: number) => handleCompItem(itemCode),
    onUpdateNotes: handleUpdateNotes,
  };

  /* ── Handlers ── */
  function handleVoidCheck() {
    if (!order?.chk_no) {
      toast.error("Nothing to void");
      return;
    }
    setIsVoidDialogOpen(true);
  }

  function handleConfirmVoid(reason: string) {
    const payload: SendOrderOverrides = {
      branchId: selectedBranchId!,
      chkNo: order!.chk_no,
      chkDate: chkDateStr,
      tableNo: tableNo ?? "0",
      items: localCart,
      guestNo: order!.gust_no ?? 1,
      waiter: order!.waiter ?? undefined,
      cashier: order!.casher_code ?? undefined,
      tax,
      service,
      discount: discountAmount,
      disc_kind: discKind,
      discPrsn: discPrsn,
      chkStut: 5,
      void_chk: total,
      notes_chk: reason,
      chk_kind: 2,
    };
    saveMutation.mutate(payload);
    setIsVoidDialogOpen(false);
  }

  const handleSend = () => {
    if (localCart.length === 0) {
      toast.error("No items to send", {
        duration: 1000,
        position: "top-right",
      });
      return;
    }
    saveMutation.mutate(undefined);
  };

  const handlePrint = () => {
    if (isPrinting) return;

    if (!selectedBranchId) {
      toast.error("Branch is not selected", {
        duration: 1200,
        position: "top-right",
      });
      return;
    }

    const chkNoValue = order?.chk_no;
    if (!chkNoValue) {
      toast.error("Check number is missing", {
        duration: 1200,
        position: "top-right",
      });
      return;
    }

    const sendPayload =
      localCart.length > 0
        ? {
            branchId: selectedBranchId,
            chkNo: chkNoValue ?? 0,
            chkDate: chkDateStr,
            tableNo: tableNo ?? "0",
            items: localCart,
            guestNo: order?.gust_no ?? 1,
            waiter: order?.waiter ?? undefined,
            cashier: order?.casher_code ?? undefined,
            tax,
            service,
            discount: discountAmount,
            disc_kind: discKind,
            discPrsn: discPrsn,
            chk_kind: 2,
          }
        : undefined;

    setIsPrinting(true);
    navigate("/dinning");

    queryClient.invalidateQueries({
      queryKey: ["tableOrder", selectedBranchId, tableNo, chkDateStr],
    });

    enqueuePrintJob({
      branchId: selectedBranchId,
      chkNo: Number(chkNoValue),
      sendPayload,
    });

    setTimeout(() => setIsPrinting(false), 0);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden lg:gap-3">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-black/20 p-2 backdrop-blur-md sm:p-2.5 lg:p-3">
        <div className="flex min-h-0 flex-1 items-stretch gap-2 overflow-hidden sm:gap-4">
          {/* ── LEFT : Menu panel — grid locks MenuFooter to bottom row ── */}
          <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
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
                    toast.success(`${item.item} added`, {
                      duration: 1000,
                      position: "top-right",
                    });
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
                isPrinting={isPrinting}
                discountPrsn={discPrsn}
                checkInfo={checkInfo}
                isNewCheck={!order}
                hasItems={localCart.length > 0}
                onSend={handleSend}
                onDiscount={() => setDiscountOpen(true)}
                onPrint={handlePrint}
                onPay={() => setPayDrawerOpen(true)}
                onVoid={handleVoidCheck}
                onSplit={() => toast("Split - to be implemented")}
              />
            </div>
          </div>

          {/* ── RIGHT : Cart sidebar — desktop only ── */}
          <div className="hidden h-full min-h-0 w-96 max-w-full shrink-0 self-stretch lg:flex lg:flex-col">
            <CartSidebar {...cartProps} />
          </div>

          {/* ── Floating cart button — mobile only ── */}
          <button
            onClick={() => setCartOpen(true)}
            type="button"
            className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full border border-white/15 bg-gradient-to-r from-fuchsia-600 to-purple-700 px-4 py-3 text-white shadow-xl shadow-purple-900/50 transition hover:brightness-110 active:scale-[0.98] lg:hidden"
          >
            <ShoppingCart size={20} />
            <span className="text-sm font-semibold">
              {localCart.length} items
            </span>
            <span className="text-sm font-bold">· {total.toFixed(0)} EGP</span>
          </button>

          {/* ── Bottom sheet — mobile only ── */}
          <div className="lg:hidden">
            <CartBottomSheet
              {...cartProps}
              isOpen={cartOpen}
              onClose={() => setCartOpen(false)}
            />
          </div>
        </div>
      </div>

      {/* Discount dialog */}
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
        onCancel={() => {
          setDiscountOpen(false);
        }}
      />

      {/* Payment Drawer */}
      <PaymentDrawer
        isOpen={payDrawerOpen}
        onClose={() => setPayDrawerOpen(false)}
        checkTotal={total}
        tableNumber={tableNo!}
        items={localCart.map((item) => ({
          name: item.Item?.item || "Unknown Item",
          quantity: item.qty || 1,
          unitPrice: item.u_price || 0,
          note: item.notes,
        }))}
        tax={tax}
        onConfirm={(data: PaymentFormData) => {
          // 1. Derive chkStut
          let chkStut = 1; // Open
          const hasCash = data.cash > 0;
          const hasVisa = data.visaAmount > 0;
          const hasCL = data.clAmount > 0;

          if (data.isComp) {
            chkStut = 7; // ENT
          } else if (hasCash && !hasVisa && !hasCL) {
            chkStut = 2; // Cash
          } else if (!hasCash && hasVisa && !hasCL) {
            chkStut = 3; // Visa
          } else if (hasCL && !hasCash && !hasVisa) {
            chkStut = 4; // CL
          } else {
            // Mixed or something else
            const count = [hasCash, hasVisa, hasCL].filter(Boolean).length;
            if (count > 1) {
              chkStut = 6; // Mix
            } else if (hasCL) {
              chkStut = 4;
            }
          }

          // 2. Derive visa_code
          let visaCode = 4; // Other
          if (data.cardType === "Visa") visaCode = 1;
          else if (data.cardType === "Mastercard") visaCode = 2;
          else if (data.cardType === "Amex") visaCode = 3;

          // 3. Prepare payload
          const payload: SendOrderOverrides = {
            branchId: selectedBranchId!,
            chkNo: order?.chk_no ?? 0,
            chkDate: chkDateStr,
            tableNo: tableNo ?? "0",
            items: localCart,
            guestNo: order?.gust_no ?? 1,
            waiter: order?.waiter ?? undefined,
            cashier: order?.casher_code ?? undefined,
            tax: data.tax !== undefined ? data.tax : tax,
            service: data.service !== undefined ? data.service : service,
            discount: data.discountAmount !== undefined ? data.discountAmount : discountAmount,
            disc_kind: data.discountPrsn ? 1 : discKind,
            discPrsn: data.discountPrsn !== undefined ? data.discountPrsn : discPrsn,
            chkStut: data.chkStut || chkStut,
            cash: data.cash,
            visa: data.visaAmount,
            credit: data.clAmount,
            paidValue: data.cash + data.visaAmount + data.clAmount,
            visa_no: data.visaNo,
            visa_code: visaCode,
            cust_code: data.customerId || undefined,
            void_chk: 0, // Not void here
            ent: data.isComp ? subtotal : 0,
          };

          saveMutation.mutate(payload);
          setPayDrawerOpen(false);
        }}
      />

      {/* Void Reason Dialog */}
      <VoidReasonDialog
        isOpen={isVoidDialogOpen}
        onClose={() => setIsVoidDialogOpen(false)}
        onConfirm={handleConfirmVoid}
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
