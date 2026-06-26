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
  UserCheck,
  ShoppingCart,
  X,
  ArrowLeftRight,
  Plus,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@goldensoft/core-schemas";
import { useChecksApi } from "@/hooks/api/useChecksApi";
import { SupervisorOverrideDialog } from "./SupervisorOverrideDialog";
import { TransferTableDialog } from "./TransferTableDialog";
import { TransferWaiterDialog } from "./TransferWaiterDialog";
import { HasPermission } from "../auth/HasPermission";

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
  checkId?: string;
  onNewCheck?: () => void;
  mode?: 'dining' | 'dine-in' | 'din-in' | 'takeaway' | 'delivery';
  mood?: 'dining' | 'dine-in' | 'din-in' | 'takeaway' | 'delivery';
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
  checkId,
  onNewCheck,
  mode,
  mood,
}: Props) {
  const activeMode = mode || mood;
  const showTableInfo = activeMode !== "takeaway" && activeMode !== "delivery";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const checksApi = useChecksApi();

  // Dialog States
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferWaiterModalOpen, setTransferWaiterModalOpen] = useState(false);
  const [supervisorOpen, setSupervisorOpen] = useState(false);
  const [supervisorError, setSupervisorError] = useState<string | null>(null);
  const [supervisorRequiredPerm, setSupervisorRequiredPerm] = useState<string>(PERMISSIONS.CHECK_TABLE_TRANSFER);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isTransferringWaiter, setIsTransferringWaiter] = useState(false);
  const [savedSupervisorPin, setSavedSupervisorPin] = useState<string | undefined>(undefined);
  const [savedWaiterSupervisorPin, setSavedWaiterSupervisorPin] = useState<string | undefined>(undefined);

  const handleTransferClick = () => {
    setSupervisorRequiredPerm(PERMISSIONS.CHECK_TABLE_TRANSFER);
    if (canTransferTable) {
      setTransferModalOpen(true);
    } else {
      setSupervisorError(null);
      setSupervisorOpen(true);
    }
  };

  const handleTransferWaiterClick = () => {
    setSupervisorRequiredPerm(PERMISSIONS.CHECK_WAITER_TRANSFER);
    if (canTransferWaiter) {
      setTransferWaiterModalOpen(true);
    } else {
      setSupervisorError(null);
      setSupervisorOpen(true);
    }
  };

  const handleSupervisorSubmit = (pin: string) => {
    if (supervisorRequiredPerm === PERMISSIONS.CHECK_TABLE_TRANSFER) {
      setSavedSupervisorPin(pin);
      setSupervisorOpen(false);
      setTransferModalOpen(true);
    } else if (supervisorRequiredPerm === PERMISSIONS.CHECK_WAITER_TRANSFER) {
      setSavedWaiterSupervisorPin(pin);
      setSupervisorOpen(false);
      setTransferWaiterModalOpen(true);
    }
  };

  const handleTableSelect = async (targetTableId: string) => {
    if (!checkId) {
      toast.error("No active check to transfer");
      return;
    }
    setIsTransferring(true);
    try {
      await checksApi.transferTable.mutateAsync({
        chkId: checkId,
        targetTableId,
        supervisorPin: savedSupervisorPin
      });
      toast.success("Table transferred successfully!");
      setTransferModalOpen(false);
      setSavedSupervisorPin(undefined);
      
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["openChecks"] });
      queryClient.invalidateQueries({ queryKey: ["checks"] });
      queryClient.invalidateQueries({ queryKey: ["check", checkId] });
      
      navigate("/dine-in");
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || "Failed to transfer table";
      if (savedSupervisorPin && (errMsg.includes("supervisor") || errMsg.includes("PIN") || errMsg.includes("Unauthorized") || errMsg.includes("privilege"))) {
        setTransferModalOpen(false);
        setSupervisorError(errMsg);
        setSupervisorRequiredPerm(PERMISSIONS.CHECK_TABLE_TRANSFER);
        setSupervisorOpen(true);
        setSavedSupervisorPin(undefined);
      } else {
        toast.error(errMsg);
      }
    } finally {
      setIsTransferring(false);
    }
  };

  const handleWaiterSelect = async (targetWaiterId: string) => {
    if (!checkId) {
      toast.error("No active check to transfer");
      return;
    }
    setIsTransferringWaiter(true);
    try {
      await checksApi.transferWaiter.mutateAsync({
        chkId: checkId,
        targetWaiterId,
        supervisorPin: savedWaiterSupervisorPin
      });
      toast.success("Waiter transferred successfully!");
      setTransferWaiterModalOpen(false);
      setSavedWaiterSupervisorPin(undefined);
      
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["openChecks"] });
      queryClient.invalidateQueries({ queryKey: ["checks"] });
      queryClient.invalidateQueries({ queryKey: ["check", checkId] });
      
      navigate("/dine-in");
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || "Failed to transfer waiter";
      if (savedWaiterSupervisorPin && (errMsg.includes("supervisor") || errMsg.includes("PIN") || errMsg.includes("Unauthorized") || errMsg.includes("privilege"))) {
        setTransferWaiterModalOpen(false);
        setSupervisorError(errMsg);
        setSupervisorRequiredPerm(PERMISSIONS.CHECK_WAITER_TRANSFER);
        setSupervisorOpen(true);
        setSavedWaiterSupervisorPin(undefined);
      } else {
        toast.error(errMsg);
      }
    } finally {
      setIsTransferringWaiter(false);
    }
  };

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
  const canTransferTable = can(PERMISSIONS.CHECK_TABLE_TRANSFER);
  const canTransferWaiter = can(PERMISSIONS.CHECK_WAITER_TRANSFER);

  const tooltipNoAccess = "You don't have access to this";


  // New check gating: Disable everything except Send until first send.
  const isSendDisabled = isSending || !canSend || (isNewCheck && !hasItems);
  const isOtherActionsDisabled = isNewCheck;

  return (
    <>
      <div className="shrink-0 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2 lg:p-3 space-y-2 lg:space-y-3">
      <div className={`grid grid-cols-1 ${!showTableInfo ? "lg:grid-cols-[1fr_280px]" : "lg:grid-cols-2"} divide-y lg:divide-y-0 lg:divide-x dark:divide-gray-700 border-t dark:border-gray-700`}>
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

          <button
            onClick={onPay}
            disabled={isOtherActionsDisabled || !canPay}
            title={!canPay ? tooltipNoAccess : undefined}
            className="flex items-center justify-center gap-1 py-2 lg:py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition col-span-1 disabled:opacity-50"
          >
            <CreditCard size={18} />
            <span>Pay</span>
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

          {!hideSplit ? (
            <button
              onClick={onSplit}
              disabled={isOtherActionsDisabled}
              className="flex items-center justify-center gap-1 py-2 lg:py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium transition col-span-1 disabled:opacity-50"
            >
              <Split size={14} />
              <span className="hidden sm:inline">Split</span>
            </button>
          ): (<button
            onClick={onNewCheck}
            disabled={!hasItems}
            className="flex items-center justify-center gap-1 py-2 lg:py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium transition col-span-1 disabled:opacity-50"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">New Check</span>
          </button>
          )}

          {showTableInfo && (
            <button
              onClick={handleTransferClick}
              disabled={isOtherActionsDisabled}
              className="flex items-center justify-center gap-1 py-2 lg:py-3 bg-zinc-500 hover:bg-zinc-600 text-white rounded-xl text-sm font-medium transition col-span-1 disabled:opacity-50"
            >
              <ArrowLeftRight size={14} />
              <span className="hidden sm:inline">Transfer Table</span>
            </button>
          )}

          {showTableInfo && (
            <button
              onClick={handleTransferWaiterClick}
              disabled={isOtherActionsDisabled}
              className="flex items-center justify-center gap-1 py-2 lg:py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-medium transition col-span-1 disabled:opacity-50"
            >
              <UserCheck size={14} />
              <span className="hidden sm:inline">Transfer Waiter</span>
            </button>
          )}

          {!hideExit && (
            <Link
              to={!showTableInfo ? "/" : "/dine-in"}
              className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl
              text-red-500 dark:text-red-400 border-2 border-red-400 dark:border-red-800
              hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-all  col-span-1"
            >
              <X size={15} />
              Exit
            </Link>
          )}

          <HasPermission permission={PERMISSIONS.CHECK_VOID}>
            <button
            onClick={onVoid}
            disabled={isOtherActionsDisabled || !canVoid}
            title={!canVoid ? tooltipNoAccess : undefined}
            className="flex items-center justify-center gap-1 py-2 lg:py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition col-span-1 disabled:opacity-50"
          >
            <X size={18} />
            <span className="hidden sm:inline">Void</span>
          </button>
          </HasPermission>
        </div>

        {/* Check Info */}
        <div className="p-3 lg:p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 lg:mb-4">
            Check Info
          </h3>
          <div className={`grid ${showTableInfo ? "grid-cols-2" : "grid-cols-1"} gap-x-4 lg:gap-x-8 gap-y-2 lg:gap-y-3 text-sm`}>
            <InfoRow
              icon={<Calendar size={14} />}
              label="Date"
              value={formattedDate}
            />

          {showTableInfo && (
            <InfoRow
              icon={<Users size={14} />}
              label="Guests"
              value={guestNo}
            />
          )}

            <InfoRow
              icon={<Clock size={14} />}
              label="Time"
              value={formattedTime}
              hideOnMobile
            />
            
            {showTableInfo && (
              <InfoRow
                icon={<ShoppingCart size={14} />}
                label="Table #"
                value={tableNo}
              />
            )}
            
            <InfoRow icon={<Hash size={14} />} label="Check" value={checkNo} />
            
            {showTableInfo && (
            <InfoRow
              icon={<User size={14} />}
              label="Waiter"
              value={waiterName}
              hideOnMobile
            />
            )}
            <InfoRow
              icon={<UserCircle size={14} />}
              label="Cashier"
              value={cashierName}
              hideOnMobile
            />

            {showTableInfo && (
              <InfoRow
                icon={<ShoppingCart size={14} />}
                label="Name"
                value={tableName}
                hideOnMobile
            />
          )}
          </div>
        </div>
      </div>
    </div>

      <SupervisorOverrideDialog
        open={supervisorOpen}
        onClose={() => setSupervisorOpen(false)}
        onSubmit={handleSupervisorSubmit}
        isLoading={isTransferring || isTransferringWaiter}
        error={supervisorError}
        permissionRequired={supervisorRequiredPerm}
      />

      <TransferTableDialog
        open={transferModalOpen}
        onClose={() => {
          setTransferModalOpen(false);
          setSavedSupervisorPin(undefined);
        }}
        tableName={tableName}
        tableNo={tableNo}
        onTransfer={handleTableSelect}
        isTransferring={isTransferring}
      />

      <TransferWaiterDialog
        open={transferWaiterModalOpen}
        onClose={() => {
          setTransferWaiterModalOpen(false);
          setSavedWaiterSupervisorPin(undefined);
        }}
        tableName={tableName}
        tableNo={tableNo}
        onTransfer={handleWaiterSelect}
        isTransferring={isTransferringWaiter}
      />
    </>
  );
}
