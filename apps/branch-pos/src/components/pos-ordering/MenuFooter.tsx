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
import { useLanSocket } from "@/hooks/useLanSocket";
import { SupervisorOverrideDialog } from "./SupervisorOverrideDialog";
import { TransferTableDialog } from "./TransferTableDialog";
import { TransferWaiterDialog } from "./TransferWaiterDialog";
import { HasPermission } from "../auth/HasPermission";
import { GuestCountDialog } from "./GuestCountDialog";
import { TableNameDialog } from "./TableNameDialog";

interface CheckInfo {
  formattedDate: string;
  formattedTime: string;
  checkNo: string | number;
  tableNo: string | undefined;
  tableId?: string | null;
  tableName: string;
  guestNo: number;
  waiterName: string | number;
  cashierName: string;
  printCount: number;
  waiterId?: string;
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
  onGuestCountChange?: (count: number) => void;
  onTableNameChange?: (name: string) => void;
}

function InfoRow({
  icon,
  label,
  value,
  hideOnMobile = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hideOnMobile?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between ${hideOnMobile ? "hidden lg:flex" : ""} ${
        onClick ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 p-1.5 -m-1.5 rounded-xl transition active:scale-98 select-none" : ""
      }`}
    >
      <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
        {icon} {label}
      </span>
      <span className={`font-semibold truncate max-w-[120px] ${
        onClick ? "text-indigo-600 dark:text-indigo-400 underline decoration-dotted" : "text-gray-800 dark:text-white"
      }`}>
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
  onGuestCountChange,
  onTableNameChange,
}: Props) {
  const activeMode = mode || mood;
  const showTableInfo = activeMode !== "takeaway" && activeMode !== "delivery";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const checksApi = useChecksApi();
  const { logAction } = useLanSocket();

  // Dialog States
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferWaiterModalOpen, setTransferWaiterModalOpen] = useState(false);
  const [supervisorOpen, setSupervisorOpen] = useState(false);
  const [supervisorError, setSupervisorError] = useState<string | null>(null);
  const [supervisorRequiredPerm, setSupervisorRequiredPerm] = useState<string>(PERMISSIONS.CHECK_TABLE_TRANSFER);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isTransferringWaiter, setIsTransferringWaiter] = useState(false);
  const [savedSupervisorPin, setSavedSupervisorPin] = useState<string | undefined>(undefined);
  const [savedSupervisorId, setSavedSupervisorId] = useState<string | undefined>(undefined);
  const [savedSupervisorName, setSavedSupervisorName] = useState<string | undefined>(undefined);
  const [savedWaiterSupervisorPin, setSavedWaiterSupervisorPin] = useState<string | undefined>(undefined);
  const [savedWaiterSupervisorId, setSavedWaiterSupervisorId] = useState<string | undefined>(undefined);
  const [savedWaiterSupervisorName, setSavedWaiterSupervisorName] = useState<string | undefined>(undefined);

  // Guest Count and Table Name States
  const [guestCountModalOpen, setGuestCountModalOpen] = useState(false);
  const [tableNameModalOpen, setTableNameModalOpen] = useState(false);
  const [isSavingGuestCount, setIsSavingGuestCount] = useState(false);
  const [isSavingTableName, setIsSavingTableName] = useState(false);

  const handleSaveGuestCount = async (newCount: number, supervisorPin?: string, supervisorId?: string) => {
    if (isNewCheck) {
      if (onGuestCountChange) {
        onGuestCountChange(newCount);
      }
      setGuestCountModalOpen(false);
      return;
    }

    if (!checkId) {
      toast.error("No active check to update");
      return;
    }

    setIsSavingGuestCount(true);
    try {
      await checksApi.updateCheckGuestCount.mutateAsync({
        chkId: checkId,
        guestCount: newCount,
        supervisorPin,
        supervisorId,
      });
      toast.success("Guest count updated successfully");
      setGuestCountModalOpen(false);

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["openChecks"] });
      queryClient.invalidateQueries({ queryKey: ["checks"] });
      queryClient.invalidateQueries({ queryKey: ["check", checkId] });
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || "Failed to update guest count";
      toast.error(errMsg);
      throw err;
    } finally {
      setIsSavingGuestCount(false);
    }
  };

  const handleSaveTableName = async (newName: string) => {
    if (isNewCheck) {
      if (onTableNameChange) {
        onTableNameChange(newName);
      }
      setTableNameModalOpen(false);
      return;
    }

    if (!checkId) {
      toast.error("No active check to update");
      return;
    }

    setIsSavingTableName(true);
    try {
      await checksApi.updateCheckTableName.mutateAsync({
        chkId: checkId,
        tableName: newName,
      });
      toast.success("Table name updated successfully");
      setTableNameModalOpen(false);

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["openChecks"] });
      queryClient.invalidateQueries({ queryKey: ["checks"] });
      queryClient.invalidateQueries({ queryKey: ["check", checkId] });
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || "Failed to update table name";
      toast.error(errMsg);
    } finally {
      setIsSavingTableName(false);
    }
  };

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

  const handleSupervisorSubmit = (pin: string, supervisorId: string, supervisorUsername: string) => {
    if (supervisorRequiredPerm === PERMISSIONS.CHECK_TABLE_TRANSFER) {
      setSavedSupervisorPin(pin);
      setSavedSupervisorId(supervisorId);
      setSavedSupervisorName(supervisorUsername);
      setSupervisorOpen(false);
      setTransferModalOpen(true);
    } else if (supervisorRequiredPerm === PERMISSIONS.CHECK_WAITER_TRANSFER) {
      setSavedWaiterSupervisorPin(pin);
      setSavedWaiterSupervisorId(supervisorId);
      setSavedWaiterSupervisorName(supervisorUsername);
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
        supervisorPin: savedSupervisorPin,
        supervisorId: savedSupervisorId
      });
      logAction('TABLE_TRANSFER', { checkId, targetTableId, supervisorPinUsed: !!savedSupervisorPin }, { tableId: checkInfo.tableId, tableNo: checkInfo.tableNo, checkId, permitterId: savedSupervisorId, permitterName: savedSupervisorName });
      toast.success("Table transferred successfully!");
      setTransferModalOpen(false);
      setSavedSupervisorPin(undefined);
      setSavedSupervisorId(undefined);
      setSavedSupervisorName(undefined);
      
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["openChecks"] });
      queryClient.invalidateQueries({ queryKey: ["checks"] });
      queryClient.invalidateQueries({ queryKey: ["check", checkId] });
      
      navigate("/dine-in");
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || "Failed to transfer table";
      if (savedSupervisorPin && (errMsg.includes("supervisor") || errMsg.includes("PIN") || errMsg.includes("Unauthorized") || errMsg.includes("privilege") || errMsg.includes("Forbidden"))) {
        setTransferModalOpen(false);
        setSupervisorError(errMsg);
        setSupervisorRequiredPerm(PERMISSIONS.CHECK_TABLE_TRANSFER);
        setSupervisorOpen(true);
        setSavedSupervisorPin(undefined);
        setSavedSupervisorId(undefined);
        setSavedSupervisorName(undefined);
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
        supervisorPin: savedWaiterSupervisorPin,
        supervisorId: savedWaiterSupervisorId
      });
      logAction('WAITER_TRANSFER', { checkId, targetWaiterId, supervisorPinUsed: !!savedWaiterSupervisorPin }, { tableId: checkInfo.tableId, tableNo: checkInfo.tableNo, checkId, permitterId: savedWaiterSupervisorId, permitterName: savedWaiterSupervisorName });
      toast.success("Waiter transferred successfully!");
      setTransferWaiterModalOpen(false);
      setSavedWaiterSupervisorPin(undefined);
      setSavedWaiterSupervisorId(undefined);
      setSavedWaiterSupervisorName(undefined);
      
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["openChecks"] });
      queryClient.invalidateQueries({ queryKey: ["checks"] });
      queryClient.invalidateQueries({ queryKey: ["check", checkId] });
      
      navigate("/dine-in");
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || "Failed to transfer waiter";
      if (savedWaiterSupervisorPin && (errMsg.includes("supervisor") || errMsg.includes("PIN") || errMsg.includes("Unauthorized") || errMsg.includes("privilege") || errMsg.includes("Forbidden"))) {
        setTransferWaiterModalOpen(false);
        setSupervisorError(errMsg);
        setSupervisorRequiredPerm(PERMISSIONS.CHECK_WAITER_TRANSFER);
        setSupervisorOpen(true);
        setSavedWaiterSupervisorPin(undefined);
        setSavedWaiterSupervisorId(undefined);
        setSavedWaiterSupervisorName(undefined);
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
  const canVoid = can(PERMISSIONS.CHECK_VOID);
  const canPay = can(PERMISSIONS.CHECK_CLOSE);
  const canTransferTable = can(PERMISSIONS.CHECK_TABLE_TRANSFER);
  const canTransferWaiter = can(PERMISSIONS.CHECK_WAITER_TRANSFER);

  const tooltipNoAccess = "You don't have access to this";

  const isDineIn = activeMode === "dining" || activeMode === "dine-in" || activeMode === "din-in";

  let isSendDisabled = false;
  let isOtherActionsDisabled = false;

  if (isDineIn) {
    if (isNewCheck) {
      isSendDisabled = isSending || !canSend || !hasItems;
      isOtherActionsDisabled = true;
    } else {
      isSendDisabled = isSending || !canSend;
      isOtherActionsDisabled = false;
    }
  } else {
    isSendDisabled = isSending || !canSend || !hasItems;
    isOtherActionsDisabled = !hasItems;
  }

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
            disabled={isOtherActionsDisabled}
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
              onClick={() => setGuestCountModalOpen(true)}
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
                onClick={() => setTableNameModalOpen(true)}
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
          setSavedSupervisorId(undefined);
          setSavedSupervisorName(undefined);
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
          setSavedWaiterSupervisorId(undefined);
          setSavedWaiterSupervisorName(undefined);
        }}
        tableName={tableName}
        tableNo={tableNo}
        onTransfer={handleWaiterSelect}
        isTransferring={isTransferringWaiter}
        currentWaiterId={checkInfo.waiterId}
      />

      <GuestCountDialog
        open={guestCountModalOpen}
        onClose={() => setGuestCountModalOpen(false)}
        currentGuestCount={guestNo}
        onSave={handleSaveGuestCount}
        isSaving={isSavingGuestCount}
      />

      <TableNameDialog
        open={tableNameModalOpen}
        onClose={() => setTableNameModalOpen(false)}
        currentTableName={tableName}
        onSave={handleSaveTableName}
        isSaving={isSavingTableName}
      />
    </>
  );
}
