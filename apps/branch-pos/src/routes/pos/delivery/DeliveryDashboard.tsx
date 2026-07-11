import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Home,
  SlidersHorizontal,
  Clock,
  Bike,
  User,
  RefreshCw,
  Menu,
  Utensils,
  ShoppingBag,
} from "lucide-react";
import {
  useChecksApi,
  useOpenChecks,
  useDeliveryZones,
  useDeliveryPilots,
} from "@/hooks/api/useChecksApi";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import DeliverySettingsDialog from "@/components/delivery/DeliverySettingsDialog";
import { CRMTab } from "../../../components/delivery/CRMTab";
import { OpenOrdersTab } from "../../../components/delivery/OpenOrdersTab";
import { ActiveTripsTab } from "../../../components/delivery/ActiveTripsTab";
import type { DeliveryCustomer } from "@goldensoft/core-schemas";

export default function DeliveryDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    "crm" | "openChecks" | "activeTrips"
  >("crm");
  const [selectedCustomer, setSelectedCustomer] =
    useState<DeliveryCustomer | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Timer interval for updating stopwatches
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle updates or selections from NewCustomerPage redirect
  useEffect(() => {
    if (location.state?.customer) {
      setSelectedCustomer(location.state.customer);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // API Hooks
  const { data: openChecks, refetch: refetchOpenChecks } = useOpenChecks();
  const { data: zones = [] } = useDeliveryZones();
  const { data: pilots = [] } = useDeliveryPilots();
  const checksApi = useChecksApi();

  // Filter open checks to get active delivery orders
  const activeDeliveryChecks = useMemo(() => {
    return (openChecks || []).filter(
      (c) => c.checkKindId === 2 && c.chkStatusId === 1,
    ); // 2 = Delivery, 1 = Open
  }, [openChecks]);

  // Queue: Undispatched open checks (Preparing or Ready)
  const undispatchedChecks = useMemo(() => {
    return activeDeliveryChecks.filter(
      (c) => !c.deliveryPilotId || (c.deliveryState !== "Dispatched" && c.deliveryState !== "Delivered"),
    );
  }, [activeDeliveryChecks]);

  // Active Trips: Dispatched open checks
  const dispatchedChecks = useMemo(() => {
    return activeDeliveryChecks.filter(
      (c) => c.deliveryPilotId && c.deliveryState === "Dispatched",
    );
  }, [activeDeliveryChecks]);

  const handleSettleCheck = async (
    chkId: string,
    paymentMethod: "cash" | "visa",
  ) => {
    const chk = activeDeliveryChecks.find((c) => c.id === chkId);
    if (!chk) return;
    setConfirmConfig({
      isOpen: true,
      title: "Settle Order",
      description: `Settle Order #${chk.chkNo} (${chk.total.toFixed(2)} EGP) via ${paymentMethod.toUpperCase()}?`,
      onConfirm: async () => {
        try {
          await checksApi.closeCheck.mutateAsync({
            chkId,
            data: {
              paymentMethod: paymentMethod === "cash" ? "Cash" : "Visa",
              paidCash: paymentMethod === "cash" ? chk.total : 0,
            },
          });
          toast.success(`Order #${chk.chkNo} settled successfully`);
          queryClient.invalidateQueries({ queryKey: ["openChecks"] });
        } catch (err: any) {
          toast.error(
            "Settlement failed: " + (err.response?.data?.error || err.message),
          );
        }
      },
    });
  };

  const handleBulkSettleChecks = async (checkIds: string[], paymentMethod: "cash" | "visa") => {
    try {
      await checksApi.batchCloseChecks.mutateAsync({
        checkIds,
        paymentMethod: paymentMethod === "cash" ? "Cash" : "Visa",
      });
      toast.success(`Batch closed ${checkIds.length} checks successfully!`);
      queryClient.invalidateQueries({ queryKey: ["openChecks"] });
    } catch (err: any) {
      toast.error("Failed to settle checks: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-[#0a0510] text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-200">
      {/* ── HEADER (Oversized touch padding) ── */}
      <header className="flex justify-between items-center px-6 h-20 bg-white dark:bg-[#120a1c] border-b border-slate-200 dark:border-white/10 shrink-0 shadow-sm z-10 select-none">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            className="w-14 h-14 p-0 rounded-2xl text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer flex items-center justify-center border border-slate-200 dark:border-white/10"
            onClick={() => navigate("/")}
          >
            <Home className="w-6 h-6 text-slate-700 dark:text-white" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                Delivery
              </h1>
            </div>
          </div>
        </div>

        {/* ── HEADER NAVIGATION (Oversized touch tags) ── */}
        <div className="flex bg-slate-100 dark:bg-[#120a1c] p-1.5 rounded-2xl border border-slate-200 dark:border-white/10 gap-1.5">
          <button
            onClick={() => setActiveTab("crm")}
            className={`h-14 px-6 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "crm"
                ? "bg-white dark:bg-[#252036] text-indigo-650 dark:text-white shadow-sm border border-slate-200/50"
                : "text-slate-600 dark:text-slate-300 hover:bg-white/5"
            }`}
          >
            <User className="w-4.5 h-4.5" />
            CRM & Directory
          </button>
          <button
            onClick={() => setActiveTab("openChecks")}
            className={`h-14 px-6 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "openChecks"
                ? "bg-white dark:bg-[#252036] text-indigo-650 dark:text-white shadow-sm border border-slate-200/50"
                : "text-slate-600 dark:text-slate-300 hover:bg-white/5"
            }`}
          >
            <Clock className="w-4.5 h-4.5" />
            Open Orders
            {undispatchedChecks.length > 0 && (
              <span className="bg-amber-500 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full ml-1">
                {undispatchedChecks.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("activeTrips")}
            className={`h-14 px-6 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "activeTrips"
                ? "bg-white dark:bg-[#252036] text-indigo-650 dark:text-white shadow-sm border border-slate-200/50"
                : "text-slate-600 dark:text-slate-300 hover:bg-white/5"
            }`}
          >
            <Bike className="w-4.5 h-4.5" />
            Active Trips
            {dispatchedChecks.length > 0 && (
              <span className="bg-indigo-600 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full ml-1">
                {dispatchedChecks.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* <Button
            onClick={() => {
              refetchOpenChecks();
              toast.success("Orders database re-indexed");
            }}
            variant="ghost"
            className="w-14 h-14 p-0 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer border border-slate-200 dark:border-white/10"
          >
            <RefreshCw className="w-5 h-5 text-slate-700 dark:text-white" />
          </Button>

          <Button
            onClick={() => navigate("/delivery/dispatch")}
            className="h-14 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs active:scale-95 transition-all flex items-center gap-2 shadow-md cursor-pointer border-none"
          >
            <Bike className="w-5 h-5 text-white" />
            Dispatch Console
          </Button> */}

          {/* Actions Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <Button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="h-14 px-4 rounded-2xl bg-slate-100 dark:bg-[#1c1829] hover:bg-slate-200 dark:hover:bg-[#252036] text-slate-700 dark:text-slate-200 text-xs font-black active:scale-95 transition-all flex items-center gap-1.5 border border-slate-200 dark:border-white/10 cursor-pointer shadow-sm"
            >
              <Menu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Menu
            </Button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#1c1829] border border-slate-200 dark:border-white/10 shadow-2xl z-50 overflow-hidden py-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate("/delivery/dispatch");
                  }}
                  className="w-full h-14 px-5 flex items-center gap-3 text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 duration-75 transition-transform cursor-pointer"
                >
                  <Bike className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Dispatch Console</span>
                </button>
                <button
                  onClick={() => {
                    setSettingsOpen(true);
                    setDropdownOpen(false);
                  }}
                  className="w-full h-14 px-5 flex items-center gap-3 text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 duration-75 transition-transform cursor-pointer"
                >
                  <SlidersHorizontal className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Config</span>
                </button>
                <div className="border-t border-slate-200 dark:border-white/10 my-1"></div>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate("/dine-in");
                  }}
                  className="w-full h-14 px-5 flex items-center gap-3 text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 duration-75 transition-transform cursor-pointer"
                >
                  <Utensils className="w-4.5 h-4.5 text-brand-600" />
                  <span>Dine-in</span>
                </button>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate("/takeaway");
                  }}
                  className="w-full h-14 px-5 flex items-center gap-3 text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 duration-75 transition-transform cursor-pointer"
                >
                  <ShoppingBag className="w-4.5 h-4.5 text-brand-600" />
                  <span>Takeaway</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN WORKSPACE ── */}
      <main className="flex-1 p-6 min-h-0 overflow-hidden bg-slate-100/50 dark:bg-transparent">
        {activeTab === "crm" && (
          <CRMTab
            selectedCustomer={selectedCustomer}
            setSelectedCustomer={setSelectedCustomer}
            zones={
              zones as { id: string; name: string; deliveryCharge: number }[]
            }
            pilots={pilots}
            activeDeliveryChecks={activeDeliveryChecks}
            openChecks={openChecks}
          />
        )}

        {activeTab === "openChecks" && (
          <OpenOrdersTab
            activeDeliveryChecks={activeDeliveryChecks}
            currentTime={currentTime}
            pilots={pilots}
            onSettleChecks={handleBulkSettleChecks}
          />
        )}

        {activeTab === "activeTrips" && (
          <ActiveTripsTab
            dispatchedChecks={dispatchedChecks}
            pilots={pilots}
            currentTime={currentTime}
          />
        )}
      </main>

      <DeliverySettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />

      <ConfirmationDialog
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        description={confirmConfig.description}
      />
    </div>
  );
}
