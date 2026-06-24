import {
  Send,
  Percent,
  Printer,
  CreditCard,
  Split,
  Loader2,
  Calendar,
  Clock,
  Hash,
  Users,
  User,
  UserCircle,
  ShoppingCart,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@goldensoft/core-schemas";

interface CheckInfo {
  formattedDate: string;
  formattedTime: string;
  checkNo: string | number;
  tableNo: string | undefined;
  tableName: string;
  guestNo: number;
  waiterName: string | number;
  cashierName: string;
  printCount: number;
}

interface Props {
  isSending: boolean;
  isPrinting: boolean;
  discountPrsn: number;
  discountValue: number;
  checkInfo: CheckInfo;
  onSend: () => void;
  onDiscount: () => void;
  onPrint: () => void;
  onPay: () => void;
  onSplit: () => void;
  onVoid: () => void;
  isNewCheck?: boolean;
  hasItems?: boolean;
  hideSplit?: boolean;
  hideExit?: boolean;
}

function InfoRow({
  icon,
  label,
  value,
  hideOnMobile = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hideOnMobile?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${hideOnMobile ? "hidden lg:flex" : ""}`}
    >
      <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
        {icon} {label}
      </span>
      <span className="font-semibold text-gray-800 dark:text-white truncate max-w-[120px]">
        {value}
      </span>
    </div>
  );
}

export default function MenuFooter({
  isSending,
  isPrinting,
  discountPrsn,
  discountValue,
  checkInfo,
  onSend,
  onDiscount,
  onPrint,
  onPay,
  onSplit,
  onVoid,
  isNewCheck = false,
  hasItems = false,
  hideSplit = false,
  hideExit = false,
}: Props) {
  const {
    formattedDate,
    formattedTime,
    checkNo,
    tableNo,
    tableName,
    guestNo,
    waiterName,
    cashierName,
    printCount,
  } = checkInfo;

  const { hasPermission: can } = usePermissions();

  const canSend = can(PERMISSIONS.CHECK_CREATE);
  const canDiscount = can(PERMISSIONS.DISCOUNT_APPLY);
  const canVoid = can(PERMISSIONS.CHECK_VOID);
  const canPay = can(PERMISSIONS.CHECK_CLOSE);

  const tooltipNoAccess = "You don't have access to this";


  // New check gating: Disable everything except Send until first send.
  const isSendDisabled = isSending || !canSend || (isNewCheck && !hasItems);
  const isOtherActionsDisabled = isNewCheck;

  return (
    <div className="shrink-0 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2 lg:p-3 space-y-2 lg:space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x dark:divide-gray-700 border-t dark:border-gray-700">
        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-1.5 lg:gap-2 px-1 lg:px-2 py-2 lg:py-3">
          <button
            onClick={onSend}
            disabled={isSendDisabled}
            title={!canSend ? tooltipNoAccess : undefined}
            className="flex items-center justify-center gap-1 py-2 lg:py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition disabled:opacity-50"
          >
            {isSending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
            <span className="hidden sm:inline">Send</span>
          </button>
          <button
            onClick={onDiscount}
            disabled={isOtherActionsDisabled || !canDiscount}
            title={!canDiscount ? tooltipNoAccess : undefined}
            className="relative flex items-center justify-center gap-1 py-2 lg:py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition disabled:opacity-50"
          >
            <Percent size={18} />
            <span className="hidden sm:inline">Discount</span>
            {(discountPrsn > 0 || discountValue > 0) && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold min-w-[20px] h-[20px] px-1 flex items-center justify-center rounded-full shadow border-2 border-white dark:border-gray-800">
                {discountPrsn > 0 ? `${discountPrsn}%` : `-${discountValue}`}
              </span>
            )}
          </button>
          <button
            onClick={onPrint}
            disabled={isPrinting || isOtherActionsDisabled}
            className="relative flex items-center justify-center gap-1 py-2 lg:py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-50"
          >
            {isPrinting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Printer size={18} />
            )}
            <span className="hidden sm:inline">Print</span>
            {printCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold min-w-[20px] h-[20px] px-1 flex items-center justify-center rounded-full shadow border-2 border-white dark:border-gray-800">
                {printCount}
              </span>
            )}
          </button>
          {!hideExit && (
            <Link
              to="/dine-in"
              className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl
              text-red-500 dark:text-red-400 border-2 border-red-400 dark:border-red-800
              hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-all  col-span-1"
            >
              <X size={15} />
              Exit
            </Link>
          )}
          <button
            onClick={onVoid}
            disabled={isOtherActionsDisabled || !canVoid}
            title={!canVoid ? tooltipNoAccess : undefined}
            className="flex items-center justify-center gap-1 py-2 lg:py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition col-span-1 disabled:opacity-50"
          >
            <X size={18} />
            <span className="hidden sm:inline">Void</span>
          </button>
          {!hideSplit && (
            <button
              onClick={onSplit}
              disabled={isOtherActionsDisabled}
              className="flex items-center justify-center gap-1 py-2 lg:py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium transition col-span-1 disabled:opacity-50"
            >
              <Split size={14} />
              <span className="hidden sm:inline">Split</span>
            </button>
          )}
          <button
            onClick={onPay}
            disabled={isOtherActionsDisabled || !canPay}
            title={!canPay ? tooltipNoAccess : undefined}
            className="flex items-center justify-center gap-1 py-2 lg:py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition col-span-1 disabled:opacity-50"
          >
            <CreditCard size={18} />
            <span>Pay</span>
          </button>
        </div>

        {/* Check Info */}
        <div className="p-3 lg:p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 lg:mb-4">
            Check Info
          </h3>
          <div className="grid grid-cols-2 gap-x-4 lg:gap-x-8 gap-y-2 lg:gap-y-3 text-sm">
            <InfoRow
              icon={<Calendar size={14} />}
              label="Date"
              value={formattedDate}
            />
            <InfoRow
              icon={<Clock size={14} />}
              label="Time"
              value={formattedTime}
              hideOnMobile
            />
            <InfoRow icon={<Hash size={14} />} label="Check" value={checkNo} />
            <InfoRow
              icon={<ShoppingCart size={14} />}
              label="Table #"
              value={tableNo}
            />
            <InfoRow
              icon={<Users size={14} />}
              label="Guests"
              value={guestNo}
            />
            <InfoRow
              icon={<User size={14} />}
              label="Waiter"
              value={waiterName}
              hideOnMobile
            />
            <InfoRow
              icon={<UserCircle size={14} />}
              label="Cashier"
              value={cashierName}
              hideOnMobile
            />
            <InfoRow
              icon={<ShoppingCart size={14} />}
              label="Name"
              value={tableName}
              hideOnMobile
            />
          </div>
        </div>
      </div>
    </div>
  );
}
