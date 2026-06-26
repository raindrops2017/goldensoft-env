import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Delete } from "lucide-react";

interface NumpadPopupProps {
  isOpen: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

export function NumpadPopup({
  isOpen,
  value,
  onChange,
  onClose,
  anchorRef,
}: NumpadPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const popupHeight = 350; // approximate including margins
      const popupWidth = 240;
      
      let top = rect.bottom + window.scrollY + 8;
      let left = rect.left + window.scrollX;

      // Flip if off-screen at bottom
      if (rect.bottom + popupHeight > window.innerHeight) {
        top = rect.top + window.scrollY - popupHeight - 8;
      }

      // Horizontal adjustment if off-screen at right
      if (left + popupWidth > window.innerWidth) {
        left = window.innerWidth - popupWidth - 16;
      }

      setCoords({ top, left });
    }
  }, [isOpen, anchorRef]);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  const handleKey = (key: string) => {
    if (key === "C") {
      onChange("0");
    } else if (key === "back") {
      onChange(value.length > 1 ? value.slice(0, -1) : "0");
    } else {
      const newValue = value === "0" ? key : value + key;
      if (newValue.length <= 4) {
        onChange(newValue);
      }
    }
  };

  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["C", "0", "back"],
  ];

  return createPortal(
    <div
      ref={popupRef}
      style={{
        position: "absolute",
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        zIndex: 9999,
      }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-brand-500/20 p-4 w-[240px] animate-in fade-in zoom-in duration-150"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Quantity
        </span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 transition"
        >
          <X size={18} />
        </button>
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 mb-4 text-center">
        <span className="text-3xl font-bold dark:text-white">{value}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {keys.flat().map((key) => (
          <button
            key={key}
            onClick={() => handleKey(key)}
            className={`
              h-16 rounded-xl flex items-center justify-center text-2xl font-bold transition-all active:scale-95
              ${
                key === "C"
                  ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20"
                  : key === "back"
                  ? "bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-200"
              }
            `}
          >
            {key === "back" ? <Delete size={20} /> : key}
          </button>
        ))}
      </div>

      <button
        onClick={onClose}
        className="w-full mt-4 h-16 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-lg font-bold shadow-lg shadow-brand-500/25 transition-all active:scale-[0.98]"
      >
        Confirm
      </button>
    </div>,
    document.body
  );
}
