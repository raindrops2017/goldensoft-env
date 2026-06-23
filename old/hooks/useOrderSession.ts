import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBranch } from "@/context/BranchContext";
import { sendOrder } from "@/services/checksApi";
import { OptionsResponse } from "@/services/optionsApi";
import { ItemJson } from "@/interfaces/ItemInterface";
import {
  OrderItem,
  ChkHead,
  OrderMode,
  ChkKind,
  VoidReasonId,
} from "@/types/check.types";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatTimeHHMMSS(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function formatDbDateTime(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

interface OrderSessionConfig {
  mode: OrderMode;
  tableNo?: string;
  chkDate: string;
  chkKind: ChkKind;
  initialCheck?: ChkHead;
  options?: OptionsResponse;
  onSuccess?: () => void;
}

export function useOrderSession({
  mode,
  tableNo,
  chkDate,
  chkKind,
  initialCheck,
  options,
  onSuccess,
}: OrderSessionConfig) {
  const { user } = useAuth();
  const { selectedBranch } = useBranch();
  const selectedBranchId = selectedBranch?.id ?? null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [localCart, setLocalCart] = useState<OrderItem[]>([]);
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [discKind, setDiscKind] = useState<number>(0);
  const [discPrsn, setDiscPrsn] = useState<number>(0);

  // Sync cart when initialCheck changes
  useEffect(() => {
    if (initialCheck?.ChkDetails) {
      setLocalCart(
        initialCheck.ChkDetails.map((d: any) => ({
          item_code: d.item_code,
          ser: d.ser ?? undefined,
          qty: Number(d.qty) || 0,
          u_price: Number(d.u_price) || 0,
          ent_item: d.ent_item != null ? Number(d.ent_item) : undefined,
          notes: d.notes ?? undefined,
          Item: { item: d.Item?.item ?? "", pic_name: d.Item?.pic_name ?? "" },
          void_time: d.void_time ?? undefined,
          voide_kind: d.voide_kind ?? undefined,
          voide_name: d.voide_name ?? undefined,
          Void_Stuts: d.Void_Stuts ?? undefined,
          void_qty: d.void_qty ?? undefined,
          it_time: d.it_time ?? undefined,
        }))
      );
    } else {
      setLocalCart([]);
    }
    setAppliedDiscount(initialCheck?.discount ?? 0);
    setDiscKind(initialCheck?.disc_kind ?? 0);
    setDiscPrsn(initialCheck?.disc_prsn ?? 0);
  }, [initialCheck]);

  const { subtotal, discountAmount, service, tax, total } = useMemo(() => {
    const subtotalCalc = localCart
      .filter((d) => d.qty > 0)
      .reduce((sum, d) => sum + d.qty * d.u_price, 0);
    const net = subtotalCalc - appliedDiscount;
    const saleTaxPct = options?.sale_tax ?? 0;
    const serviceChargePct = mode === "takeaway" ? 0 : (options?.service_charge ?? 0);
    const serviceVal = (net * serviceChargePct) / 100;
    const taxVal = ((net + serviceVal) * saleTaxPct) / 100;
    const totalVal = net + serviceVal + taxVal;
    return {
      subtotal: subtotalCalc,
      discountAmount: appliedDiscount,
      service: serviceVal,
      tax: taxVal,
      total: totalVal,
    };
  }, [localCart, appliedDiscount, options]);

  const handleAddItem = (item: ItemJson) => {
    const now = new Date();
    const itTime = formatTimeHHMMSS(now);
    setLocalCart((prev) => {
      // If there is an unsent row for this item (no `ser`), increment that row.
      const existingUnsentIndex = prev.findIndex(
        (i) => i.item_code === item.code && i.ser == null
      );

      if (existingUnsentIndex !== -1) {
        return prev.map((i, idx) =>
          idx === existingUnsentIndex ? { ...i, qty: i.qty + 1 } : i
        );
      }

      // If all existing rows are already sent (have `ser`), create a NEW line.
      return [
        ...prev,
        {
          item_code: item.code,
          qty: 1,
          u_price:
            mode === "takeaway"
              ? item.sale_price_tak || item.sale_price
              : mode === "delivery"
                ? item.sale_price_delv || item.sale_price
                : item.sale_price,
          Item: { item: item.item, pic_name: item.pic_name },
          it_time: itTime,
          void_qty: 0,
        },
      ];
    });
  };

  const handleRemoveItem = (itemCode: number) => {
    setLocalCart((prev) => prev.filter((i) => i.item_code !== itemCode));
  };

  const handleChangeQty = (itemCode: number, delta: number) => {
    setLocalCart((prev) =>
      prev
        .map((i) => {
          if (i.item_code !== itemCode) return i;
          const nextQty = Math.max(0, (Number(i.qty) || 0) + delta);
          if (nextQty === 0 && i.ser != null) return { ...i, qty: 0 };
          return { ...i, qty: nextQty };
        })
        .filter(
          (i) =>
            !(
              i.ser == null &&
              i.item_code === itemCode &&
              (Number(i.qty) || 0) === 0
            )
        )
    );
  };

  const handleCompItem = (itemCode: number) => {
    setLocalCart((prev) =>
      prev.map((i) => {
        if (i.item_code !== itemCode) return i;
        const currentPrice = Number(i.u_price) || 0;
        if (currentPrice <= 0) return i;
        return { ...i, ent_item: i.ent_item ?? currentPrice, u_price: 0 };
      })
    );
  };

  const handleUpdateNotes = (itemCode: number, notes: string) => {
    setLocalCart((prev) =>
      prev.map((i) =>
        i.item_code === itemCode ? { ...i, notes: notes || undefined } : i
      )
    );
  };

  const handleVoidItem = (
    itemCode: number,
    voidQty: number,
    reasonId: VoidReasonId,
    reasonName: string
  ) => {
    if (voidQty <= 0) return;
    setLocalCart((prev) =>
      prev.map((i) => {
        if (i.item_code !== itemCode) return i;
        const newQty = Math.max(0, i.qty - voidQty);
        return {
          ...i,
          qty: newQty,
          void_qty: (i.void_qty ?? 0) + voidQty,
          void_time: formatDbDateTime(new Date()),
          voide_name: reasonName,
          voide_kind: reasonId,
          Void_Prmtion: `Online (${user?.name ?? ""})`,
        };
      })
    );
  };

  const saveMutation = useMutation({
    mutationFn: (overrides?: Partial<Parameters<typeof sendOrder>[0]>) => {
  const basePayload = {
    branchId: selectedBranchId!,
    chkNo: initialCheck?.chk_no ?? 0,
    chkDate: chkDate,
    tableNo: tableNo ?? "0",
    items: localCart,
    guestNo: initialCheck?.gust_no ?? 1,
    waiter: initialCheck?.waiter ?? undefined,
    cashier: initialCheck?.casher_code ?? undefined,
    tax,
    service,
    discount: discountAmount,
    disc_kind: discKind,
    discPrsn: discPrsn,
    chk_kind: chkKind,
  };

  // Merge overrides (e.g. notes_chk, chkStut, cash, visa…) into base
  return sendOrder({ ...basePayload, ...overrides } as any);
},
    onSuccess: () => {
      toast.success("Order sent successfully!", {
        duration: 1000,
        position: "top-right",
      });
      queryClient.invalidateQueries({
        queryKey: ["tableOrder", selectedBranchId, String(tableNo), chkDate],
      });
      queryClient.invalidateQueries({
        queryKey: ["checks", "takeaway", "open", selectedBranchId],
      });
      if (mode === "dining") {
        navigate("/dinning");
      } else {
        // For takeaway, stay on page but clear local state if saved/closed?
        // Actually the user said "Clears the current order (ready for next)" for Takeaway "Send to Kitchen".
        setLocalCart([]);
        setAppliedDiscount(0);
        setDiscKind(0);
        setDiscPrsn(0);
      }
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("Failed to send order", {
        duration: 2000,
        position: "top-right",
      });
      console.error(error);
    },
  });

  return {
    localCart,
    setLocalCart,
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
  };
}
