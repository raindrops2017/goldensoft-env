import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { useChecksApi } from "../api/useChecksApi";
import { calculateCheckTotals } from "@goldensoft/core-schemas";
import { safeRandomUUID } from "../../lib/utils";
import { useLanSocket } from "../useLanSocket";
import type { 
  CheckWithItems, 
  CheckItem, 
  MenuItem,
  CalculationOptions
} from "@goldensoft/core-schemas";

interface OrderSessionConfig {
  mode: 'dining' | 'takeaway' | 'delivery';
  tableId?: string;
  tableName?: string;
  initialCheck?: CheckWithItems;
  options?: CalculationOptions & { fixedDeliveryCharge?: number };
}

export function useOrderSession({
  mode,
  initialCheck,
  options,
  tableId,
  tableName,
}: OrderSessionConfig) {

  const checksApi = useChecksApi();
  const { logAction } = useLanSocket();

  const logCartAction = (actionType: string, details: Record<string, any>, permitter?: { id?: string; name?: string }) => {
    logAction(actionType, details, {
      tableId: tableId || initialCheck?.tableId || null,
      tableNo: tableName || initialCheck?.tableName || null,
      checkId: initialCheck?.id || null,
      permitterId: permitter?.id || null,
      permitterName: permitter?.name || null,
    });
  };

  const [localCart, setLocalCart] = useState<CheckItem[]>([]);
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0);

  // Sync cart when initialCheck changes
  useEffect(() => {
    if (initialCheck?.items) {
      setLocalCart(initialCheck.items);
      setAppliedDiscount(initialCheck.discount || 0);
      setDiscountPercent(initialCheck.discountPercent || 0);
      setDeliveryCharge(initialCheck.deliveryCharge || 0);
    } else {
      setLocalCart([]);
      setAppliedDiscount(0);
      setDiscountPercent(0);
      setDeliveryCharge(mode === 'delivery' ? (options?.fixedDeliveryCharge || 0) : 0);
    }
  }, [initialCheck, mode, options]);

  // Use the exact shared logic for calculations
  const totals = useMemo(() => {
    const calcOpts: CalculationOptions = {
      serviceChargePercent: mode === 'dining' ? (options?.serviceChargePercent || 0) : 0,
      taxPercent: options?.taxPercent || 0,
      entTax: options?.entTax || 0,
    };

    // First calculate items value to know how much to discount if it's a percent
    const tempTotals = calculateCheckTotals(localCart, 0, 0, calcOpts);
    
    let actualDiscountValue = appliedDiscount;
    if (discountPercent > 0) {
      actualDiscountValue = tempTotals.totalItemsValue * (discountPercent / 100);
    }

    const finalTotals = calculateCheckTotals(localCart, actualDiscountValue, deliveryCharge, calcOpts);
    return { ...finalTotals, actualDiscountValue };
  }, [localCart, appliedDiscount, discountPercent, deliveryCharge, options, mode]);

  const handleAddItem = async (item: MenuItem, chkId?: string, modifiers?: any[]) => {
    logCartAction('CART_ADD_ITEM', { menuItemId: item.id, itemName: item.name, checkId: chkId || 'temp' });
    setLocalCart((prev) => {
      const unsentIndex = prev.findIndex(i => i.menuItemId === item.id && i.id.startsWith('temp-'));
      
      if (unsentIndex >= 0) {
        const newCart = [...prev];
        newCart[unsentIndex] = { ...newCart[unsentIndex], qty: newCart[unsentIndex].qty + 1 };
        return newCart;
      }

      return [
        ...prev,
        {
          id: "temp-" + safeRandomUUID(),
          chkId: chkId || 'temp',
          menuItemId: item.id,
          itemName: item.name,
          itemPrice: mode === 'dining' ? (item.prices?.[0]?.diningPrice || 0) : (item.prices?.[0]?.takeAwayPrice || 0),
          qty: 1,
          voidQty: 0,
          voidKind: 0,
          entQty: 0,
          modifiers: modifiers || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as CheckItem,
      ];
    });
  };

  const handleChangeQty = (itemId: string, newQty: number) => {
    if (!itemId.startsWith('temp-')) {
       toast.error("Cannot edit quantity of sent items.");
       return;
    }
    logCartAction('CART_QTY_UPDATE', { itemId, newQty });
    setLocalCart((prev) => {
      if (newQty <= 0) return prev.filter(i => i.id !== itemId);
      return prev.map(i => i.id === itemId ? { ...i, qty: newQty } : i);
    });
  };

  const handleUpdateNotes = (itemId: string, notes: string) => {
    setLocalCart((prev) =>
      prev.map((i) => {
        if (i.id === itemId || i.menuItemId === itemId) {
          return { ...i, notes };
        }
        return i;
      })
    );
  };

  const handleVoidItem = async (
    chkId: string,
    itemId: string,
    voidQty: number,
    voidReasonId: number,
    supervisorPin?: string,
    supervisorId?: string,
    supervisorName?: string
  ) => {
    if (itemId.startsWith('temp-')) {
      // It's local only, just decrement/remove
      logCartAction('CART_ITEM_REMOVE', { itemId, checkId: chkId, qtyRemoved: voidQty });
      setLocalCart((prev) => {
        const item = prev.find(i => i.id === itemId);
        if (!item) return prev;
        if (item.qty <= voidQty) return prev.filter(i => i.id !== itemId);
        return prev.map(i => i.id === itemId ? { ...i, qty: i.qty - voidQty } : i);
      });
      return;
    }

    try {
      const updatedCheck = await checksApi.voidCheckItem.mutateAsync({
        chkId,
        itemId,
        data: { voidQty, voidReasonId, supervisorPin, supervisorId }
      });
      logCartAction('CART_ITEM_VOID', { itemId, checkId: chkId, voidQty, voidReasonId }, { id: supervisorId, name: supervisorName });
      setLocalCart(updatedCheck.items || []);
      toast.success("Item voided successfully");
    } catch (err: any) {
      throw err; // throw so the supervisor override submit handler can catch and show error in override UI
    }
  };

  const handleEntItem = async (chkId: string, itemId: string, entQty: number, supervisorPin?: string, supervisorId?: string, supervisorName?: string) => {
    if (chkId === 'temp') return; // Cannot ent unsaved checks typically

    try {
      const updatedCheck = await checksApi.entCheckItem.mutateAsync({
        chkId,
        itemId,
        data: { entQty, supervisorPin, supervisorId }
      });
      logCartAction('CART_ITEM_COMP', { itemId, checkId: chkId, entQty }, { id: supervisorId, name: supervisorName });
      setLocalCart(updatedCheck.items || []);
      toast.success("Item marked as complimentary");
    } catch (err: any) {
      throw err; // throw so supervisor override submit handler catches it
    }
  };

  const clearCart = () => {
    setLocalCart([]);
    setAppliedDiscount(0);
    setDiscountPercent(0);
  };

  return {
    localCart,
    ...totals, // totalItemsValue, net, serviceCharge, tax, entTax, total
    handleAddItem,
    handleChangeQty,
    handleVoidItem,
    handleEntItem,
    handleUpdateNotes,
    setAppliedDiscount,
    setDiscountPercent,
    appliedDiscount: totals.actualDiscountValue,
    discountPercent,
    clearCart,
    deliveryCharge,
  };
}
