import { useRef, useState } from "react";
import {
  ShoppingCart,
  Trash2,
  Loader2,
  ChevronDown,
  MessageSquareMore,
  Gift,
  Minus,
  Plus,
} from "lucide-react";
import { NumpadPopup } from "./NumpadPopup";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import OnScreenKeyboard, { type KeyboardLang } from "./OnScreenKeyboard";
import VoidItemDialog from "@/components/pos/VoidItemDialog";
import type { CartItem as TableCartItem } from "@/pages/POS/Dinning/TableOrder";
import { usePermission } from "@/hooks/usePermission";

type CartItem = TableCartItem;

interface Props {
  tableNo: string | undefined;
  orderLoading: boolean;
  localCart: CartItem[];
  subtotal: number;
  discount: number;
  discountPrsn: number;
  tax: number;
  service: number;
  total: number;
  onVoidItem: (
    code: number,
    voidQty: number,
    reasonId: 1 | 2 | 3 | 4,
    reasonName: string,
  ) => void;
  onRemoveItem: (code: number) => void;
  onChangeQty?: (code: number, delta: number) => void;
  onCompItem?: (code: number) => void;
  onUpdateNotes?: (itemCode: number, notes: string) => void;
  onClose?: () => void;
  /**
   * True when the current check has already been printed at least once.
   * Used to apply stricter RBAC levels for void/discount actions.
   */
  checkPrinted?: boolean;
  /** True when there is no persisted check yet (no initialCheck from server) */
  isNewCheck?: boolean;
}

/** Desktop sidebar */
export function CartSidebar(props: Props) {
  const {
    tableNo,
    orderLoading,
    localCart,
    subtotal,
    discount,
    discountPrsn,
    tax,
    service,
    total,
    onVoidItem,
    onUpdateNotes,
    checkPrinted = false,
  } = props;

  const { can } = usePermission();
  const canVoidAfterSend = can("orders.void_item_after_send");
  const canVoidAfterPrint = can("orders.void_item_after_print");
  const canGiftItem = can("orders.gift_item");

  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidItem, setVoidItem] = useState<CartItem | null>(null);

  const handleRequestVoid = (item: CartItem) => {
    if (item.ser == null) {
      // Before send: decrement qty by 1; row removed automatically when qty hits 0
      props.onChangeQty?.(item.item_code, -1);
      return;
    }
    setVoidItem(item);
    setVoidDialogOpen(true);
  };

  return (
    <div className="flex h-full min-h-0 w-96 max-w-full flex-col overflow-hidden rounded-2xl border bg-white text-black shadow-lg dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b p-4 dark:border-gray-700">
        <h2 className="text-lg font-semibold flex items-center gap-2 dark:text-white">
          <ShoppingCart size={18} />
          Table #{tableNo}
          {orderLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
        </h2>
      </div>

      {/* Items — scrollable middle */}
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
        />
      </div>

      {/* Footer — pinned below scroll area */}
      <div className="shrink-0 border-t dark:border-gray-700 bg-white dark:bg-gray-800">
        <CartFooter
          subtotal={subtotal}
          discount={discount}
          discountPrsn={discountPrsn}
          tax={tax}
          service={service}
          total={total}
          hideService={tableNo === "0"}
        />
      </div>

      <VoidItemDialog
        open={voidDialogOpen}
        item={voidItem}
        onConfirm={(itemCode, voidQty, reasonId, reasonName) => {
          onVoidItem(itemCode, voidQty, reasonId, reasonName);
          setVoidDialogOpen(false);
          setVoidItem(null);
        }}
        onCancel={() => {
          setVoidDialogOpen(false);
          setVoidItem(null);
        }}
      />
    </div>
  );
}

/** Mobile bottom sheet */
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
    service,
    total,
    onVoidItem,
    onUpdateNotes,
    checkPrinted = false,
  } = props;

  const { can } = usePermission();
  const canVoidAfterSend = can("orders.void_item_after_send");
  const canVoidAfterPrint = can("orders.void_item_after_print");
  const canGiftItem = can("orders.gift_item");

  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidItem, setVoidItem] = useState<CartItem | null>(null);

  const handleRequestVoid = (item: CartItem) => {
    if (item.ser == null) {
      // Before send: decrement qty by 1; row removed automatically when qty hits 0
      props.onChangeQty?.(item.item_code, -1);
      return;
    }
    setVoidItem(item);
    setVoidDialogOpen(true);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-30 transition-opacity duration-300
          ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Sheet — uses inline style for guaranteed height */}
      <div
        style={{ height: "75vh" }}
        className={`fixed bottom-0 left-0 right-0 z-40
          bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl border dark:border-gray-700
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-y-0" : "translate-y-full"}`}
      >
        {/* 
          Inner layout: pure CSS grid with 3 fixed rows
          - row 1: drag handle + header  → shrinks to content
          - row 2: items list            → fills remaining space, scrolls
          - row 3: summary + total       → shrinks to content
        */}
        <div
          className="grid h-full"
          style={{ gridTemplateRows: "auto 1fr auto" }}
        >
          {/* Row 1 — Top: drag handle + header */}
          <div>
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>
            <div className="px-4 py-3 border-b dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-base font-semibold flex items-center gap-2 dark:text-white">
                <ShoppingCart size={16} />
                Table #{tableNo}
                {orderLoading && (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                )}
              </h2>

              {/* Collapse sheet */}
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <ChevronDown size={20} />
              </button>
            </div>
          </div>

          {/* Row 2 — Middle: scrollable items */}
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
            />
          </div>

          {/* Row 3 — Bottom: summary + total + exit */}
          <div className="min-h-0 shrink-0">
            <CartFooter
              subtotal={subtotal}
              discount={discount}
              discountPrsn={discountPrsn}
              tax={tax}
              service={service}
              total={total}
              hideService={tableNo === "0"}
            />
          </div>
        </div>

        <VoidItemDialog
          open={voidDialogOpen}
          item={voidItem}
          onConfirm={(itemCode, voidQty, reasonId, reasonName) => {
            onVoidItem(itemCode, voidQty, reasonId, reasonName);
            setVoidDialogOpen(false);
            setVoidItem(null);
          }}
          onCancel={() => {
            setVoidDialogOpen(false);
            setVoidItem(null);
          }}
        />
      </div>
    </>
  );
}

/* ── Shared sub-components ── */

function CartItems({
  localCart,
  onRequestVoid,
  onChangeQty,
  onVoidItem,
  onCompItem,
  onUpdateNotes,
  canVoidAfterSend,
  canVoidAfterPrint,
  canGiftItem,
  checkPrinted,
}: {
  localCart: CartItem[];
  onRequestVoid: (item: CartItem) => void;
  onChangeQty?: (itemCode: number, delta: number) => void;
  onVoidItem?: (code: number, voidQty: number, reasonId: 1 | 2 | 3 | 4, reasonName: string) => void;
  onCompItem?: (itemCode: number) => void;
  onUpdateNotes?: (itemCode: number, notes: string) => void;
  canVoidAfterSend: boolean;
  canVoidAfterPrint: boolean;
  canGiftItem: boolean;
  checkPrinted?: boolean;
}) {
  const tooltipNoAccess = "You don't have access to this";

  const [notesItem, setNotesItem] = useState<CartItem | null>(null);
  const [notesText, setNotesText] = useState("");
  const [notesLang, setNotesLang] = useState<KeyboardLang>("en");
  const [compItem, setCompItem] = useState<CartItem | null>(null);

  // Qty numpad state
  const [numpadItem, setNumpadItem] = useState<CartItem | null>(null);
  const [numpadValue, setNumpadValue] = useState("0");
  const numpadAnchorRef = useRef<HTMLButtonElement | null>(null);

  const openNotesDialog = (item: CartItem) => {
    setNotesItem(item);
    setNotesText(item.notes ?? "");
  };

  const closeNotesDialog = () => {
    setNotesItem(null);
    setNotesText("");
    setNotesLang("en");
  };

  const saveNotes = () => {
    if (notesItem && onUpdateNotes) {
      onUpdateNotes(notesItem.item_code, notesText.trim());
    }
    closeNotesDialog();
  };

  const handleKeyboardKey = (key: string) => {
    if (key === "backspace") {
      setNotesText((prev) => prev.slice(0, -1));
    } else {
      setNotesText((prev) => prev + key);
    }
  };

  const visibleItems = localCart //.filter((d) => d.qty > 0);
    .filter((d) => (Number(d.qty) || 0) > 0);

  if (visibleItems.length === 0) {
    return (
      <p className="text-center text-sm text-gray-400 mt-8">Cart is empty</p>
    );
  }

  return (
    <>
      {visibleItems.map((d) => {
        const isSent = d.ser != null;
        const isAfterSend = isSent && !checkPrinted;
        const isAfterPrint = Boolean(checkPrinted);

        const canVoidThisItem =
          !isSent ||
          (isAfterSend && canVoidAfterSend) ||
          (isAfterPrint && canVoidAfterPrint);

        const canDiscountThisItem = isSent && canGiftItem;

        const qtyDisabled = isSent;
        const commentDisabled = isSent;

        return (
          <div
            key={d.item_code}
            className="flex gap-3 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-xl"
          >
            <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-600 overflow-hidden shrink-0">
              <img
                src="/images/items/item1.png"
                alt={d.Item.item}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate dark:text-white">
                {d.Item.item}
              </p>
              {d.notes && (
                <p className="text-xs text-blue-600 dark:text-blue-400 truncate mt-0.5 italic">
                  "{d.notes}"
                </p>
              )}
              <div className="flex items-center justify-between mt-1 text-xs text-gray-500 gap-2">
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                    <button
                      type="button"
                      onClick={() =>
                        onChangeQty &&
                        !qtyDisabled &&
                        onChangeQty(d.item_code, -1)
                      }
                      className="px-2 py-1 text-gray-600 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600/40"
                      aria-label="Decrease quantity"
                      disabled={qtyDisabled}
                    >
                      <Minus size={14} />
                    </button>
                    <button
                      type="button"
                      ref={numpadItem?.item_code === d.item_code ? numpadAnchorRef : undefined}
                      disabled={qtyDisabled}
                      onClick={(e) => {
                        if (qtyDisabled) return;
                        numpadAnchorRef.current = e.currentTarget;
                        setNumpadItem(d);
                        setNumpadValue(String(d.qty));
                      }}
                      className={`px-2 py-1 font-semibold text-gray-800 dark:text-white min-w-[28px] text-center ${
                        !qtyDisabled ? "hover:bg-brand-50 dark:hover:bg-brand-900/30 hover:text-brand-600 cursor-pointer rounded" : ""
                      }`}
                      aria-label="Edit quantity"
                    >
                      {d.qty}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onChangeQty &&
                        !qtyDisabled &&
                        onChangeQty(d.item_code, +1)
                      }
                      className="px-2 py-1 text-gray-600 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600/40"
                      aria-label="Increase quantity"
                      disabled={qtyDisabled}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="flex flex-col leading-tight">
                    {Number(d.u_price) === 0 &&
                    d.ent_item != null &&
                    d.ent_item > 0 ? (
                      <>
                        <span className="line-through opacity-70">
                          {d.ent_item}
                        </span>
                        <span>0</span>
                      </>
                    ) : (
                      <span>{d.u_price}</span>
                    )}
                  </div>
                </div>

                <span className="font-semibold dark:text-white">
                  {(Number(d.qty) || 0) * (Number(d.u_price) || 0)}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1 justify-between">
              <button
                onClick={() => onRequestVoid(d)}
                disabled={!canVoidThisItem}
                title={!canVoidThisItem && isSent ? tooltipNoAccess : undefined}
                className="self-center text-gray-400 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 size={20} />
              </button>
              <button
                onClick={() => setCompItem(d)}
                disabled={!canDiscountThisItem}
                title={!canDiscountThisItem ? tooltipNoAccess : undefined}
                className="self-center text-gray-400 hover:text-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Gift size={20} />
              </button>
              <button
                onClick={() => !commentDisabled && openNotesDialog(d)}
                className={`self-center transition-colors ${
                  d.notes
                    ? "text-blue-500"
                    : "text-gray-400 hover:text-blue-500"
                }`}
                title={
                  commentDisabled
                    ? "Comments are only allowed before send"
                    : d.notes
                      ? `Notes: ${d.notes}`
                      : "Add notes for kitchen"
                }
                disabled={commentDisabled}
              >
                <MessageSquareMore size={20} />
              </button>
            </div>
          </div>
        );
      })}

      {/* Qty numpad popup */}
      {numpadItem && (
        <NumpadPopup
          isOpen={!!numpadItem}
          value={numpadValue}
          onChange={setNumpadValue}
          onClose={() => {
            const newQty = Math.max(0, Number(numpadValue) || 0);
            if (newQty === numpadItem.qty) {
              // no change
            } else if (newQty === 0) {
              if (numpadItem.ser == null) {
                // unsent: remove entirely
                onChangeQty?.(numpadItem.item_code, -numpadItem.qty);
              } else {
                // sent: void with qty = current qty
                onVoidItem?.(numpadItem.item_code, numpadItem.qty, 1, "Wrong Entry");
              }
            } else {
              const delta = newQty - numpadItem.qty;
              onChangeQty?.(numpadItem.item_code, delta);
            }
            setNumpadItem(null);
          }}
          anchorRef={numpadAnchorRef as React.RefObject<HTMLElement | null>}
        />
      )}

      <Dialog
        open={!!compItem}
        onOpenChange={(open) => !open && setCompItem(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complimentary item</DialogTitle>
            <DialogDescription>
              {compItem ? (
                <>Apply 100% discount to &quot;{compItem.Item.item}&quot;?</>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompItem(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (compItem) onCompItem?.(compItem.item_code);
                setCompItem(null);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!notesItem}
        onOpenChange={(open) => !open && closeNotesDialog()}
      >
        <DialogContent className="max-w-lg lg:max-w-3xl lg:max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add notes for kitchen</DialogTitle>
            <DialogDescription>
              {notesItem && (
                <>
                  Add special instructions for &quot;{notesItem.Item.item}&quot;
                  (e.g. no onions, extra spicy).
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Mobile: textarea with native keyboard */}
          <textarea
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            placeholder="e.g. No onions, extra spicy, well done..."
            className="lg:hidden w-full min-h-[80px] px-3 py-2 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          {/* Desktop: display with blinking cursor + on-screen keyboard */}
          <div className="hidden lg:block relative">
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="e.g. No onions, extra spicy, well done..."
              dir={notesLang === "ar" ? "rtl" : "ltr"}
              className={`absolute inset-0 w-full min-h-[100px] px-3 py-3 rounded-lg border dark:border-gray-600
                bg-transparent text-transparent caret-transparent
                resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 z-10 cursor-text
                ${notesLang === "ar" ? "text-right" : "text-left"}`}
              aria-label="Notes for kitchen"
              style={{ direction: notesLang === "ar" ? "rtl" : "ltr" }}
            />
            <div
              dir={notesLang === "ar" ? "rtl" : "ltr"}
              className={`absolute inset-0 pointer-events-none w-full min-h-[100px] px-3 py-3 rounded-lg border dark:border-gray-600
                bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                text-base lg:text-lg break-words whitespace-pre-wrap
                ${notesLang === "ar" ? "text-right" : "text-left"}`}
            >
              {notesText || (
                <span className="text-gray-400">
                  e.g. No onions, extra spicy, well done...
                </span>
              )}
              <span
                className={`inline-block w-0.5 h-5 lg:h-6 bg-brand-500 animate-cursor-blink align-middle ms-0.5 ${
                  !notesText ? "opacity-50" : ""
                }`}
                aria-hidden
              />
            </div>
            <div className="min-h-[100px]" aria-hidden />
          </div>

          <OnScreenKeyboard
            onKey={handleKeyboardKey}
            lang={notesLang}
            onLangChange={setNotesLang}
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeNotesDialog}>
              Cancel
            </Button>
            <Button onClick={saveNotes}>Save notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CartFooter({
  subtotal,
  discount,
  discountPrsn,
  tax,
  service,
  total,
  hideService,
}: {
  subtotal: number;
  discount: number;
  discountPrsn: number;
  tax: number;
  service: number;
  total: number;
  hideService?: boolean;
}) {
  return (
    <>
      <div className="px-4 py-4 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/80 dark:to-gray-800 border-t dark:border-gray-700">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Order Summary
        </h3>
        <div className="space-y-2">
          {[
            { label: "Subtotal", value: subtotal },
            {
              label:
                discountPrsn > 0 ? `Discount (${discountPrsn}%)` : "Discount",
              value: discount,
            },
            { label: "Tax", value: tax },
            { label: "Service", value: service, hide: hideService },
          ]
            .filter((row) => !row.hide)
            .map(({ label, value }) => (
              <div
                key={label}
                className="flex justify-between items-center text-sm"
              >
                <span className="text-gray-600 dark:text-gray-400">
                  {label}
                </span>
                <span className="font-mono font-medium text-gray-900 dark:text-white">
                  {value.toFixed(2)} EGP
                </span>
              </div>
            ))}
        </div>
      </div>
      <div className="px-4 py-4 bg-gradient-to-r from-brand-500 to-brand-600 dark:from-brand-600 dark:to-brand-700 text-white">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">TOTAL</span>
          <span className="text-2xl font-bold">{total.toFixed(2)} EGP</span>
        </div>
      </div>
    </>
  );
}
