import { useRef, useState, useEffect } from "react";
import {
  Trash2,
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
import { type CheckItem, type MenuItem } from "@goldensoft/core-schemas";

interface CartItemsProps {
  localCart: CheckItem[];
  onRequestVoid: (item: CheckItem) => void;
  onChangeQty?: (itemId: string, delta: number) => void;
  onVoidItem?: (itemId: string, voidQty: number, reasonId: number) => void;
  onCompItem?: (itemId: string) => void;
  onUpdateNotes?: (itemId: string, notes: string) => void;
  canVoidAfterSend: boolean;
  canVoidAfterPrint: boolean;
  canGiftItem: boolean;
  checkPrinted?: boolean;
  menuItems?: MenuItem[];
  isScrollEnabled?: boolean;
}

export function CartItems({
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
  menuItems = [],
  isScrollEnabled = true,
}: CartItemsProps) {
  const tooltipNoAccess = "You don't have access to this";

  const [notesItem, setNotesItem] = useState<CheckItem | null>(null);
  const [notesText, setNotesText] = useState("");
  const [notesLang, setNotesLang] = useState<KeyboardLang>("en");
  const [compItem, setCompItem] = useState<CheckItem | null>(null);

  const [numpadItem, setNumpadItem] = useState<CheckItem | null>(null);
  const [numpadValue, setNumpadValue] = useState("0");
  const numpadAnchorRef = useRef<HTMLButtonElement | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLen = useRef(localCart.length);

  useEffect(() => {
    if (isScrollEnabled && localCart.length > prevLen.current) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
    prevLen.current = localCart.length;
  }, [localCart.length, isScrollEnabled]);

  useEffect(() => {
    if (isScrollEnabled) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 150);
    }
  }, [isScrollEnabled]);

  const openNotesDialog = (item: CheckItem) => {
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
      onUpdateNotes(notesItem.id || notesItem.menuItemId, notesText.trim());
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

  const visibleItems = localCart.filter((d) => (Number(d.qty) || 0) > 0);

  if (visibleItems.length === 0) {
    return (
      <p className="text-center text-sm text-gray-400 mt-8">Cart is empty</p>
    );
  }

  return (
    <>
      {visibleItems.map((d) => {
        const isSent = !!d.id && !d.id.startsWith('temp');
        const isAfterSend = isSent && !checkPrinted;
        const isAfterPrint = Boolean(checkPrinted);

        const canVoidThisItem =
          !isSent ||
          (isAfterSend && canVoidAfterSend) ||
          (isAfterPrint && canVoidAfterPrint);

        const canDiscountThisItem = isSent && canGiftItem;
        
        const itemDef = menuItems.find(m => m.id === d.menuItemId);
        const displayName = d.itemName || itemDef?.name || "Unknown Item";

        const qtyDisabled = isSent;
        const commentDisabled = isSent;

        return (
          <div
            key={d.id || d.menuItemId}
            className="flex gap-2 xl:gap-3 bg-gray-50 dark:bg-gray-700/50 p-1.5 xl:p-2 rounded-xl"
          >
            <div className="relative w-10 h-10 xl:w-12 xl:h-12 rounded-lg bg-gray-200 dark:bg-gray-600 overflow-hidden shrink-0">
              <img
                src="/images/items/item1.png"
                alt={displayName}
                className="w-full h-full object-cover"
              />
              {!isSent && (
                <div className="absolute top-0 left-0 bg-green-500 text-white text-[10px] xl:text-[12px] font-bold px-1 rounded-br shadow-sm z-10">
                  NEW
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs xl:text-sm font-medium truncate dark:text-white">
                {displayName}
              </p>
              
              <div className="flex items-center justify-between mt-1 text-[10px] xl:text-xs text-gray-500 gap-1 xl:gap-2">
                <div className="flex items-center gap-1 xl:gap-2">
                  <div className="inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                    <button
                      type="button"
                      onClick={() =>
                        onChangeQty &&
                        !qtyDisabled &&
                        onChangeQty(d.id || d.menuItemId, -1)
                      }
                      className="px-2 py-1 text-gray-600 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600/40"
                      disabled={qtyDisabled}
                    >
                      <Minus size={14} />
                    </button>
                    <button
                      type="button"
                      ref={numpadItem?.id === d.id ? numpadAnchorRef : undefined}
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
                    >
                      {d.qty}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onChangeQty &&
                        !qtyDisabled &&
                        onChangeQty(d.id || d.menuItemId, +1)
                      }
                      className="px-2 py-1 text-gray-600 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600/40"
                      disabled={qtyDisabled}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="flex flex-col leading-tight">
                    <span>{d.itemPrice}</span>
                  </div>
                </div>

                <span className="font-semibold dark:text-white">
                  {((Number(d.qty) || 0) * ((Number(d.itemPrice) || 0) + (d.modifiers?.reduce((sum, m) => sum + (m.price * m.qty), 0) || 0)))}
                </span>
              </div>
              {d.notes && (
                <p className="text-[10px] xl:text-xs text-blue-600 dark:text-blue-400 truncate mt-0.5 italic">
                  "{d.notes}"
                </p>
              )}
              {d.modifiers && d.modifiers.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {d.modifiers.map((mod, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10px] xl:text-[11px] text-gray-500 dark:text-gray-400">
                      <span className="truncate pr-2">+ {mod.name || "Modifier"}</span>
                      {mod.price > 0 && <span>{mod.price.toFixed(2)}</span>}
                    </div>
                  ))}
                </div>
              )}
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
      <div ref={bottomRef} />

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
              if (!numpadItem.id || numpadItem.id.startsWith('temp-')) {
                onChangeQty?.(numpadItem.id || numpadItem.menuItemId, -numpadItem.qty);
              } else {
                onVoidItem?.(numpadItem.id!, numpadItem.qty, 1);
              }
            } else {
              const delta = newQty - numpadItem.qty;
              onChangeQty?.(numpadItem.id || numpadItem.menuItemId, delta);
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
                <>Apply 100% discount to &quot;{compItem.itemName || menuItems.find(m => m.id === compItem.menuItemId)?.name || "Unknown Item"}&quot;?</>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompItem(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (compItem) onCompItem?.(compItem.id || compItem.menuItemId);
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
                  Add special instructions for &quot;{notesItem.itemName || menuItems.find(m => m.id === notesItem.menuItemId)?.name || "Unknown Item"}&quot;
                  (e.g. no onions, extra spicy).
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <textarea
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            placeholder="e.g. No onions, extra spicy, well done..."
            className="lg:hidden w-full min-h-[80px] px-3 py-2 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

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
