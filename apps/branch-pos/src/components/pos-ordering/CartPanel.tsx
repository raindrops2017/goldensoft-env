import { useState } from "react";
import {
  ShoppingCart,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { VoidReasonDialog } from "./VoidReasonDialog";
import { type CheckItem, type MenuItem, PERMISSIONS } from "@goldensoft/core-schemas";
import { usePermissions } from "@/hooks/usePermissions";
import { CartItems } from "./CartItems";
import { CartFooter } from "./CartFooter";

interface Props {
  tableNo: string | undefined;
  orderLoading: boolean;
  localCart: CheckItem[];
  subtotal: number;
  discount: number;
  discountPrsn: number;
  tax: number;
  entTax: number;
  service: number;
  total: number;
  onVoidItem: (
    itemId: string,
    voidQty: number,
    reasonId: number,
  ) => void;
  onRemoveItem: (itemId: string) => void;
  onChangeQty?: (itemId: string, delta: number) => void;
  onCompItem?: (itemId: string) => void;
  onUpdateNotes?: (itemId: string, notes: string) => void;
  onClose?: () => void;
  checkPrinted?: boolean;
  isNewCheck?: boolean;
  menuItems?: MenuItem[];
  mode?: 'dining' | 'dine-in' | 'din-in' | 'takeaway' | 'delivery';
  mood?: 'dining' | 'dine-in' | 'din-in' | 'takeaway' | 'delivery';
}

export function CartSidebar(props: Props) {
  const {
    tableNo,
    orderLoading,
    localCart,
    subtotal,
    discount,
    discountPrsn,
    tax,
    entTax,
    service,
    total,
    onVoidItem,
    onUpdateNotes,
    checkPrinted = false,
    menuItems,
    mode,
    mood,
  } = props;

  const activeMode = mode || mood;

  const { hasPermission } = usePermissions();
  const canVoidAfterSend = hasPermission(PERMISSIONS.CHECK_ITEM_VOID);
  const canVoidAfterPrint = hasPermission(PERMISSIONS.CHECK_ITEM_PRINTED_VOID);
  const canGiftItem = hasPermission(PERMISSIONS.CHECK_ITEM_COMP);

  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidItem, setVoidItem] = useState<CheckItem | null>(null);

  const handleRequestVoid = (item: CheckItem) => {
    if (!item.id || item.id.startsWith('temp')) {
      props.onChangeQty?.(item.id || item.menuItemId, -1);
      return;
    }
    setVoidItem(item);
    setVoidDialogOpen(true);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border bg-white text-black shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <div className="flex shrink-0 items-center justify-between border-b p-4 dark:border-gray-700">
        <h2 className="text-lg font-semibold flex items-center gap-2 dark:text-white">
          <ShoppingCart size={18} />
          {activeMode === "takeaway"
            ? "Takeaway"
            : activeMode === "delivery"
            ? "Delivery"
            : `Table #${tableNo}`}
          {orderLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 space-y-2">
        <CartItems
          localCart={localCart}
          onRequestVoid={handleRequestVoid}
          onChangeQty={props.onChangeQty}
          onCompItem={props.onCompItem}
          onUpdateNotes={onUpdateNotes}
          onVoidItem={onVoidItem}
          canVoidAfterSend={canVoidAfterSend}
          canVoidAfterPrint={canVoidAfterPrint}
          canGiftItem={canGiftItem}
          checkPrinted={checkPrinted}
          menuItems={menuItems}
          isScrollEnabled={true}
        />
      </div>

      <div className="shrink-0 border-t dark:border-gray-700 bg-white dark:bg-gray-800">
        <CartFooter
          subtotal={subtotal}
          discount={discount}
          discountPrsn={discountPrsn}
          tax={tax}
          enttax={entTax}
          service={service}
          total={total}
          hideService={tableNo === "0" || activeMode === "takeaway" || activeMode === "delivery"}
        />
      </div>

      <VoidReasonDialog
        open={voidDialogOpen}
        onOpenChange={setVoidDialogOpen}
        onConfirm={(reasonId) => {
          if (voidItem && voidItem.id) {
            onVoidItem(voidItem.id, 1, reasonId);
          }
          setVoidDialogOpen(false);
          setVoidItem(null);
        }}
      />
    </div>
  );
}

export function CartBottomSheet(props: Props & { isOpen: boolean }) {
  const {
    isOpen,
    onClose,
    tableNo,
    orderLoading,
    localCart,
    subtotal,
    discount,
    discountPrsn,
    tax,
    entTax,
    service,
    total,
    onVoidItem,
    onUpdateNotes,
    checkPrinted = false,
    menuItems,
    mode,
    mood,
  } = props;

  const activeMode = mode || mood;

  const { hasPermission } = usePermissions();
  const canVoidAfterSend = hasPermission(PERMISSIONS.CHECK_ITEM_VOID);
  const canVoidAfterPrint = hasPermission(PERMISSIONS.CHECK_ITEM_PRINTED_VOID);
  const canGiftItem = hasPermission(PERMISSIONS.CHECK_ITEM_COMP);

  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidItem, setVoidItem] = useState<CheckItem | null>(null);

  const handleRequestVoid = (item: CheckItem) => {
    if (!item.id || item.id.startsWith('temp')) {
      props.onChangeQty?.(item.id || item.menuItemId, -1);
      return;
    }
    setVoidItem(item);
    setVoidDialogOpen(true);
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-30 transition-opacity duration-300
          ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      <div
        style={{ height: "75vh" }}
        className={`fixed bottom-0 left-0 right-0 z-40
          bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl border dark:border-gray-700
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-y-0" : "translate-y-full"}`}
      >
        <div
          className="grid h-full"
          style={{ gridTemplateRows: "auto 1fr auto" }}
        >
          <div>
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>
            <div className="px-4 py-3 border-b dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-base font-semibold flex items-center gap-2 dark:text-white">
                <ShoppingCart size={16} />
                {activeMode === "takeaway"
                  ? "Takeaway"
                  : activeMode === "delivery"
                  ? "Delivery"
                  : `Table #${tableNo}`}
                {orderLoading && (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                )}
              </h2>

              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <ChevronDown size={20} />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto p-3 space-y-2">
            <CartItems
              localCart={localCart}
              onRequestVoid={handleRequestVoid}
              onChangeQty={props.onChangeQty}
              onCompItem={props.onCompItem}
              onUpdateNotes={onUpdateNotes}
              onVoidItem={onVoidItem}
              canVoidAfterSend={canVoidAfterSend}
              canVoidAfterPrint={canVoidAfterPrint}
              canGiftItem={canGiftItem}
              checkPrinted={checkPrinted}
              menuItems={menuItems}
              isScrollEnabled={isOpen}
            />
          </div>

          <div className="min-h-0 shrink-0">
            <CartFooter
              subtotal={subtotal}
              discount={discount}
              discountPrsn={discountPrsn}
              tax={tax}
              enttax={entTax}
              service={service}
              total={total}
              hideService={tableNo === "0" || activeMode === "takeaway" || activeMode === "delivery"}
            />
          </div>
        </div>

        <VoidReasonDialog
          open={voidDialogOpen}
          onOpenChange={setVoidDialogOpen}
          onConfirm={(reasonId) => {
            if (voidItem && voidItem.id) {
              onVoidItem(voidItem.id, 1, reasonId);
            }
            setVoidDialogOpen(false);
            setVoidItem(null);
          }}
        />
      </div>
    </>
  );
}