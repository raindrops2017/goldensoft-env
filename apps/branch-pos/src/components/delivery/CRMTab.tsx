import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, UserPlus, User, Pencil, Phone, Clock, MapPin, Calendar, ShoppingBag, X, ChevronRight, Check, Plus, PackageOpen, 
  ShieldUser, ChevronDown, ChevronUp
} from "lucide-react";
import { useChecksApi, useCustomerLastOrder, useHistoricalChecks } from "@/hooks/api/useChecksApi";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { DeliveryCustomer, DeliveryPilot } from "@goldensoft/core-schemas";
import { PhoneDialog } from "./PhoneDialog";
import { AddressDialog } from "./AddressDialog";

interface Props {
  selectedCustomer: DeliveryCustomer | null;
  setSelectedCustomer: (cust: DeliveryCustomer | null) => void;
  zones: { id: string; name: string; deliveryCharge: number }[];
  pilots: DeliveryPilot[];
  activeDeliveryChecks: any[];
  openChecks: any[] | undefined;
}

export function CRMTab({
  selectedCustomer,
  setSelectedCustomer,
  zones,
  pilots,
  activeDeliveryChecks,
  openChecks
}: Props) {
  const navigate = useNavigate();
  const checksApi = useChecksApi();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DeliveryCustomer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [profileTab, setProfileTab] = useState<"basic" | "addresses" | "history" | "timeline">("basic");
  const [selectedHistoryCheck, setSelectedHistoryCheck] = useState<any | null>(null);
  const [expandedCheckId, setExpandedCheckId] = useState<string | null>(null);

  // Selected phone and address index states before starting order
  const [selectedPhoneNum, setSelectedPhoneNum] = useState<string | null>(null);
  const [selectedAddressIdx, setSelectedAddressIdx] = useState<number>(-1);

  // Phone modal state
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [editingPhone, setEditingPhone] = useState<{ phone: string; isDefault: boolean } | null>(null);

  // Address modal state
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any | null>(null);

  // Live timer for tracking transit elapsed time
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch telemetry and history
  const { data: lastOrder } = useCustomerLastOrder(selectedCustomer?.id || "", {
    enabled: !!selectedCustomer?.id
  });

  const { data: customerHistory = [] } = useHistoricalChecks({
    deliveryCustomerId: selectedCustomer?.id
  });

  // Reset tab on customer change
  useEffect(() => {
    setProfileTab("basic");
    setSelectedHistoryCheck(null);
  }, [selectedCustomer?.id]);

  // Manage phone and address selection before taking an order
  useEffect(() => {
    if (!selectedCustomer) {
      setSelectedPhoneNum(null);
      setSelectedAddressIdx(-1);
      return;
    }

    // Resolve address selection: default address first, else first address if present
    const defaultAddrIdx = selectedCustomer.addresses?.findIndex(a => a.isDefault) ?? -1;
    setSelectedAddressIdx(defaultAddrIdx !== -1 ? defaultAddrIdx : (selectedCustomer.addresses?.length > 0 ? 0 : -1));

    // Resolve phone selection: if query matches secondary phone, select it directly
    const cleanSearchQuery = searchQuery.trim();
    const matchedPhoneObj = selectedCustomer.phones?.find(p => p.phone === cleanSearchQuery);
    if (matchedPhoneObj) {
      setSelectedPhoneNum(matchedPhoneObj.phone);
    } else {
      const primaryPhoneObj = selectedCustomer.phones?.find(p => p.isDefault) || selectedCustomer.phones?.[0];
      setSelectedPhoneNum(primaryPhoneObj?.phone || null);
    }
  }, [selectedCustomer, searchQuery]);

  // Sidebar list mapping
  const activeDeliveryCustomers = useMemo(() => {
    const customersMap = new Map<string, { id: string; name: string; phone: string; checkNo: string; checkId: string }>();
    activeDeliveryChecks.forEach(c => {
      if (c.deliveryCustomerId && c.deliveryState !== "Delivered") {
        customersMap.set(c.deliveryCustomerId, {
          id: c.deliveryCustomerId,
          name: c.customerName || "Walk-In",
          phone: c.customerPhone || "N/A",
          checkNo: c.chkNo.toString(),
          checkId: c.id
        });
      }
    });
    return Array.from(customersMap.values());
  }, [activeDeliveryChecks]);

  const customerActiveCheck = useMemo(() => {
    if (!selectedCustomer) return null;
    return activeDeliveryChecks.find(
      (c) =>
        c.deliveryCustomerId === selectedCustomer.id &&
        c.deliveryState !== "Delivered",
    );
  }, [selectedCustomer, activeDeliveryChecks]);

  const customerUnsettledChecks = useMemo(() => {
    if (!selectedCustomer) return [];
    return activeDeliveryChecks.filter((c) => c.deliveryCustomerId === selectedCustomer.id);
  }, [selectedCustomer, activeDeliveryChecks]);

  useEffect(() => {
    if (customerUnsettledChecks.length > 0) {
      setExpandedCheckId(customerUnsettledChecks[0].id);
    } else {
      setExpandedCheckId(null);
    }
  }, [selectedCustomer?.id, customerUnsettledChecks.length]);

  const checkToShowTimeline = useMemo(() => {
    return customerActiveCheck || selectedHistoryCheck;
  }, [customerActiveCheck, selectedHistoryCheck]);

  const lastOrderRecency = useMemo(() => {
    if (!lastOrder?.createdAt) return "Never";
    const lastDate = new Date(lastOrder.createdAt).getTime();
    const diffMs = new Date().getTime() - lastDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  }, [lastOrder]);

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await api.get(`/delivery/customers/search?phone=${query}`);
      const data = res.data.data;
      const results = Array.isArray(data) ? data : (data ? [data] : []);
      setSearchResults(results);
      if (results.length === 1) {
        setSelectedCustomer(results[0]);
      } else if (results.length === 0) {
        toast.info("No customer found. Opening registration page...");
        navigate("/delivery/customer/new", { 
          state: { query, from: "/delivery" } 
        });
      }
    } catch (e: any) {
      toast.error("Search failed: " + (e.response?.data?.error || e.message));
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleStartOrder = (addressIdx: number, phoneNum?: string | null) => {
    if (!selectedCustomer) return;
    const finalPhone = phoneNum || selectedPhoneNum || selectedCustomer.phones?.find(p => p.isDefault)?.phone || selectedCustomer.phones?.[0]?.phone || null;
    navigate("/delivery/order", {
      state: {
        customer: selectedCustomer,
        addressIndex: addressIdx,
        selectedPhone: finalPhone
      }
    });
  };

  // Phone Save and Delete (RHF triggered callbacks)
  const onSavePhone = async (data: { phone: string; isDefault: boolean }) => {
    if (!selectedCustomer) return;

    let updatedPhones = [...(selectedCustomer.phones || [])].map(p => ({
      phone: p.phone,
      isDefault: data.isDefault ? false : p.isDefault
    }));

    if (editingPhone) {
      updatedPhones = updatedPhones.map(p => {
        if (p.phone === editingPhone.phone) {
          return { phone: data.phone, isDefault: data.isDefault };
        }
        return p;
      });
    } else {
      if (updatedPhones.some(p => p.phone === data.phone)) {
        toast.error("Phone number already registered for this customer");
        return;
      }
      updatedPhones.push({ phone: data.phone, isDefault: data.isDefault || updatedPhones.length === 0 });
    }

    if (!updatedPhones.some(p => p.isDefault) && updatedPhones.length > 0) {
      updatedPhones[0].isDefault = true;
    }

    try {
      const saved = await checksApi.updateDeliveryCustomer.mutateAsync({
        id: selectedCustomer.id,
        data: {
          name: selectedCustomer.name,
          agentNotes: selectedCustomer.agentNotes,
          phones: updatedPhones,
          addresses: selectedCustomer.addresses.map(a => ({
            deliveryZoneId: a.deliveryZoneId,
            address: a.address,
            floor: a.floor,
            unit: a.unit,
            landmark: a.landmark,
            notes: a.notes,
            isDefault: a.isDefault
          }))
        }
      });
      setSelectedCustomer(saved);
      toast.success("Phone numbers updated");
      setPhoneDialogOpen(false);
    } catch (err: any) {
      toast.error("Failed to save phone: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDeletePhone = async (phoneToDelete: string) => {
    if (!selectedCustomer) return;
    if (selectedCustomer.phones.length <= 1) {
      toast.error("A customer profile must have at least one phone number");
      return;
    }

    const updatedPhones = selectedCustomer.phones
      .filter(p => p.phone !== phoneToDelete)
      .map(p => ({ phone: p.phone, isDefault: p.isDefault }));

    if (!updatedPhones.some(p => p.isDefault) && updatedPhones.length > 0) {
      updatedPhones[0].isDefault = true;
    }

    try {
      const saved = await checksApi.updateDeliveryCustomer.mutateAsync({
        id: selectedCustomer.id,
        data: {
          name: selectedCustomer.name,
          agentNotes: selectedCustomer.agentNotes,
          phones: updatedPhones,
          addresses: selectedCustomer.addresses.map(a => ({
            deliveryZoneId: a.deliveryZoneId,
            address: a.address,
            floor: a.floor,
            unit: a.unit,
            landmark: a.landmark,
            notes: a.notes,
            isDefault: a.isDefault
          }))
        }
      });
      setSelectedCustomer(saved);
      toast.success("Phone number deleted");
    } catch (err: any) {
      toast.error("Failed to delete phone: " + (err.response?.data?.error || err.message));
    }
  };

  // Address Save, Delete and default settings
  const onSaveAddress = async (data: any) => {
    if (!selectedCustomer) return;

    let updatedAddresses = [...(selectedCustomer.addresses || [])].map(a => ({
      deliveryZoneId: a.deliveryZoneId,
      address: a.address,
      floor: a.floor,
      unit: a.unit,
      landmark: a.landmark,
      notes: a.notes,
      isDefault: data.isDefault ? false : a.isDefault
    }));

    const newAddressObj = {
      deliveryZoneId: data.deliveryZoneId,
      address: data.address,
      floor: data.floor || null,
      unit: data.unit || null,
      landmark: data.landmark || null,
      notes: data.notes || null,
      isDefault: data.isDefault || updatedAddresses.length === 0
    };

    if (editingAddress) {
      updatedAddresses = updatedAddresses.map(a => {
        if (a.address === editingAddress.address && a.deliveryZoneId === editingAddress.deliveryZoneId) {
          return newAddressObj;
        }
        return a;
      });
    } else {
      updatedAddresses.push(newAddressObj);
    }

    if (!updatedAddresses.some(a => a.isDefault) && updatedAddresses.length > 0) {
      updatedAddresses[0].isDefault = true;
    }

    try {
      const saved = await checksApi.updateDeliveryCustomer.mutateAsync({
        id: selectedCustomer.id,
        data: {
          name: selectedCustomer.name,
          agentNotes: selectedCustomer.agentNotes,
          phones: selectedCustomer.phones.map(p => ({ phone: p.phone, isDefault: p.isDefault })),
          addresses: updatedAddresses
        }
      });
      setSelectedCustomer(saved);
      toast.success("Addresses updated");
      setAddressDialogOpen(false);
    } catch (err: any) {
      toast.error("Failed to save address: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteAddress = async (addrToDelete: any) => {
    if (!selectedCustomer || !addrToDelete) return;
    if (selectedCustomer.addresses.length <= 1) {
      toast.error("A customer profile must have at least one delivery address");
      return;
    }

    const updatedAddresses = selectedCustomer.addresses
      .filter(a => !(a.address === addrToDelete.address && a.deliveryZoneId === addrToDelete.deliveryZoneId))
      .map(a => ({
        deliveryZoneId: a.deliveryZoneId,
        address: a.address,
        floor: a.floor,
        unit: a.unit,
        landmark: a.landmark,
        notes: a.notes,
        isDefault: a.isDefault
      }));

    if (!updatedAddresses.some(a => a.isDefault) && updatedAddresses.length > 0) {
      updatedAddresses[0].isDefault = true;
    }

    try {
      const saved = await checksApi.updateDeliveryCustomer.mutateAsync({
        id: selectedCustomer.id,
        data: {
          name: selectedCustomer.name,
          agentNotes: selectedCustomer.agentNotes,
          phones: selectedCustomer.phones.map(p => ({ phone: p.phone, isDefault: p.isDefault })),
          addresses: updatedAddresses
        }
      });
      setSelectedCustomer(saved);
      toast.success("Address deleted");
    } catch (err: any) {
      toast.error("Failed to delete address: " + (err.response?.data?.error || err.message));
    }
  };

  const handleSetPrimaryAddress = async (addrToSet: any) => {
    if (!selectedCustomer || !addrToSet) return;
    const updatedAddresses = selectedCustomer.addresses.map(a => ({
      deliveryZoneId: a.deliveryZoneId,
      address: a.address,
      floor: a.floor,
      unit: a.unit,
      landmark: a.landmark,
      notes: a.notes,
      isDefault: a.address === addrToSet.address && a.deliveryZoneId === addrToSet.deliveryZoneId
    }));

    try {
      const saved = await checksApi.updateDeliveryCustomer.mutateAsync({
        id: selectedCustomer.id,
        data: {
          name: selectedCustomer.name,
          agentNotes: selectedCustomer.agentNotes,
          phones: selectedCustomer.phones.map(p => ({ phone: p.phone, isDefault: p.isDefault })),
          addresses: updatedAddresses
        }
      });
      setSelectedCustomer(saved);
      toast.success("Primary address updated");
    } catch (err: any) {
      toast.error("Failed to set primary address: " + (err.response?.data?.error || err.message));
    }
  };

  const formatElapsedHMS = (isoString?: string, endIsoString?: string) => {
    if (!isoString) return "00:00:00";
    const start = new Date(isoString).getTime();
    const end = endIsoString ? new Date(endIsoString).getTime() : currentTime.getTime();
    const elapsedMs = end - start;
    if (elapsedMs < 0) return "00:00:00";
    const totalSecs = Math.floor(elapsedMs / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex h-full gap-5 overflow-hidden select-none">
      {/* ── LEFT COLUMN: ACTIVE ORDERS ONLY (Width: 35%) ── */}
      <div className="w-[35%] flex flex-col bg-white dark:bg-[#151120] border border-slate-200 dark:border-white/10 rounded-3xl p-5 shadow-sm min-h-0 overflow-hidden">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2 text-left">
            <PackageOpen className="w-5 h-5 text-indigo-500" />
            <h2 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-wider">
              Active Orders
            </h2>
            <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-black px-2.5 py-0.5 rounded-full border border-indigo-500/25">
              {activeDeliveryCustomers.length}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          {activeDeliveryCustomers.length > 0 ? (
            activeDeliveryCustomers.map((cust) => {
              const isCurrent = selectedCustomer?.id === cust.id;
              return (
                <button
                  key={cust.id}
                  className={`flex items-center justify-between w-full p-4 border rounded-2xl text-left transition-all cursor-pointer ${
                    isCurrent
                      ? "bg-indigo-500/10 dark:bg-[#252036] text-indigo-700 dark:text-indigo-200 border-indigo-500/30 dark:border-white/10"
                      : "bg-white dark:bg-[#1c1829] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-[#252036]"
                  }`}
                  onClick={() => {
                    const fullCustFromActive = openChecks?.find(c => c.deliveryCustomerId === cust.id)?.deliveryCustomer;
                    if (fullCustFromActive) {
                      setSelectedCustomer(fullCustFromActive as any);
                    } else {
                      setSelectedCustomer({
                        id: cust.id,
                        name: cust.name,
                        phones: [{ phone: cust.phone, isDefault: true, id: "ph", deliveryCustomerId: cust.id }],
                        addresses: [],
                        totalOrders: 0,
                        totalSpent: 0,
                        averageTicket: 0,
                        createdAt: "",
                        updatedAt: ""
                      } as any);
                    }
                  }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-800 dark:text-white">{cust.name}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400 font-bold">
                      <span>{cust.phone}</span>
                      <span>•</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-black">Check #{cust.checkNo}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-400 text-center">
              <Clock className="w-8 h-8 mb-2 opacity-25" />
              <p className="text-xs font-bold">No active delivery orders</p>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT COLUMN: SELECTED CUSTOMER DETAILS / SEARCH LOOKUP (Width: 65%) ── */}
      <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-[#151120] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm overflow-hidden">
        {!selectedCustomer ? (
          <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center p-8 w-full">
            <Search className="w-14 h-14 mb-4 text-indigo-500 opacity-40 animate-pulse" />
            <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wider mb-6">Customer Directory Search</h3>
            
            {/* Search Input Bar */}
            <div className="flex gap-3 mb-6 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search phone or name..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.trim() === "") {
                      setSearchResults([]);
                    }
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full h-16 bg-slate-50 dark:bg-[#1c1829] text-slate-900 dark:text-white pl-12 pr-4 rounded-2xl border border-slate-200 dark:border-white/5 focus:outline-none focus:border-indigo-500 transition-all font-bold text-sm"
                />
              </div>
              <Button
                className="h-16 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm active:scale-95 transition-all cursor-pointer border-none"
                onClick={handleSearch}
                disabled={isSearching}
              >
                {isSearching ? "..." : "Search"}
              </Button>
              <Button
                variant="outline"
                className="h-16 w-16 rounded-2xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1829] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#252036] active:scale-95 transition-all p-0 flex items-center justify-center cursor-pointer shrink-0"
                onClick={() => navigate("/delivery/customer/new", { state: { from: "/delivery" } })}
              >
                <UserPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </Button>
            </div>

            {/* Results matched list */}
            <div className="w-full max-h-[350px] overflow-y-auto space-y-2 pr-1 scrollbar-thin text-left">
              {searchResults.length > 0 ? (
                searchResults.map((cust) => {
                  const primaryPhone = cust.phones?.find(p => p.isDefault)?.phone || cust.phones?.[0]?.phone || "No Phone";
                  return (
                    <button
                      key={cust.id}
                      className="flex items-center justify-between w-full p-4 border rounded-2xl text-left bg-white dark:bg-[#1c1829] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-[#252036] transition-all cursor-pointer"
                      onClick={() => setSelectedCustomer(cust)}
                    >
                      <div>
                        <p className="font-extrabold text-sm text-slate-800 dark:text-white">{cust.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1">{primaryPhone}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </button>
                  );
                })
              ) : searchQuery.trim() !== "" && !isSearching ? (
                <div className="flex flex-col items-center justify-center py-6 text-center text-slate-500 dark:text-slate-400">
                  <UserPlus className="w-12 h-12 mb-3 opacity-30 text-indigo-500" />
                  <p className="text-sm font-bold">No customer found</p>
                  <Button
                    className="mt-4 h-14 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black active:scale-95 transition-all border-none cursor-pointer"
                    onClick={() => {
                      navigate("/delivery/customer/new", {
                        state: {
                          query: searchQuery,
                          from: "/delivery"
                        }
                      });
                    }}
                  >
                    Register New Customer
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-slate-400 dark:text-slate-500 text-center">
                  <p className="text-xs font-bold">Enter customer details above or select from Active Orders</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full min-h-0 overflow-hidden">
            {/* VIP Profile Header - Oversized */}
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/10 pb-4 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-sm">
                  <ShieldUser />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                      {selectedCustomer.name}
                    </h3>
                    {/* <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                      CRM Record
                    </span> */}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1">
                    Member since {selectedCustomer.createdAt ? new Date(selectedCustomer.createdAt).toLocaleDateString('en-GB') : "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  onClick={() => navigate("/delivery/customer/new", { state: { customer: selectedCustomer, from: "/delivery" } })}
                  className="h-14 px-4 rounded-xl bg-slate-100 dark:bg-[#1c1829] hover:bg-slate-200 dark:hover:bg-[#252036] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 text-xs font-bold active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Pencil className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  Edit Profile
                </Button>
                <Button
                  onClick={() => {
                    handleStartOrder(selectedAddressIdx !== -1 ? selectedAddressIdx : 0);
                  }}
                  className="h-14 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer border-none shadow-sm"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Create Ticket
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleClearCustomer}
                  className="h-14 w-14 p-0 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Profile detail Tab list - h-14 tabs with bigger font sizes */}
            <div className="flex border-b border-slate-100 dark:border-white/10 mb-4 shrink-0 gap-6 mt-3">
              <button
                onClick={() => setProfileTab("basic")}
                className={`pb-3 text-sm font-extrabold uppercase border-b-4 transition-all cursor-pointer flex items-center gap-2 ${
                  profileTab === "basic"
                    ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400"
                }`}
              >
                <User className="w-4 h-4" />
                Details
              </button>
              <button
                onClick={() => setProfileTab("addresses")}
                className={`pb-3 text-sm font-extrabold uppercase border-b-4 transition-all cursor-pointer flex items-center gap-2 ${
                  profileTab === "addresses"
                    ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400"
                }`}
              >
                <MapPin className="w-4 h-4" />
                Address Book ({selectedCustomer.addresses?.length || 0})
              </button>
              <button
                onClick={() => setProfileTab("history")}
                className={`pb-3 text-sm font-extrabold uppercase border-b-4 transition-all cursor-pointer flex items-center gap-2 ${
                  profileTab === "history"
                    ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400"
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                History ({customerHistory.length})
              </button>
              <button
                onClick={() => setProfileTab("timeline")}
                className={`pb-3 text-sm font-extrabold uppercase border-b-4 transition-all cursor-pointer flex items-center gap-2 relative ${
                  profileTab === "timeline"
                    ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400"
                }`}
              >
                <Clock className="w-4 h-4" />
                Tracker
                {customerActiveCheck && (
                  <span className="absolute -top-0.5 -right-2.5 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                )}
              </button>
            </div>

            {/* ── SubTab 1: Basic details ── */}
            {profileTab === "basic" && (
              <div className="flex-1 min-h-0 flex flex-col gap-5 overflow-y-auto pr-1 scrollbar-thin">
                {/* KPIs Stats Block - Large */}
                <div className="grid grid-cols-4 gap-4 shrink-0">
                  <div className="bg-slate-50 dark:bg-[#1c1829] border border-slate-200 dark:border-white/5 p-4 rounded-2xl text-center shadow-sm">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider block">Total Invoices</span>
                    <span className="text-xl font-black text-slate-800 dark:text-white mt-1.5 block leading-none">{selectedCustomer.totalOrders || 0}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#1c1829] border border-slate-200 dark:border-white/5 p-4 rounded-2xl text-center shadow-sm">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider block">Revenue</span>
                    <span className="text-xl font-black text-slate-800 dark:text-white mt-1.5 block leading-none">{(selectedCustomer.totalSpent || 0).toFixed(1)} EGP</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#1c1829] border border-slate-200 dark:border-white/5 p-4 rounded-2xl text-center shadow-sm">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider block">Average Spend</span>
                    <span className="text-xl font-black text-slate-800 dark:text-white mt-1.5 block leading-none">{(selectedCustomer.averageTicket || 0).toFixed(1)} EGP</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-[#1c1829] border border-slate-200 dark:border-white/5 p-4 rounded-2xl text-center shadow-sm">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider block">Last Ticket</span>
                    <span className="text-sm font-black text-slate-800 dark:text-white mt-1.5 block leading-none truncate">{lastOrderRecency}</span>
                  </div>
                </div>

                {/* Sales Agent Notes Banner */}
                {selectedCustomer.agentNotes && (
                  <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 shrink-0 shadow-sm text-left">
                    <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-amber-500" /> Sales Agent Notes (Internal)
                    </h4>
                    <p className="text-sm text-slate-700 dark:text-slate-200 font-semibold leading-relaxed">
                      {selectedCustomer.agentNotes}
                    </p>
                  </div>
                )}

                {/* Phone Numbers panel */}
                <div className="bg-slate-50 dark:bg-[#1c1829] border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex-1 flex flex-col min-h-0 shadow-sm">
                  <div className="flex justify-between items-center mb-4 shrink-0">
                    <h4 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Phone className="w-4 h-4 text-indigo-500" /> Phone Registry
                    </h4>
                    <Button
                      className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold active:scale-95 transition-all flex items-center gap-1 cursor-pointer border-none"
                      onClick={() => {
                        setEditingPhone(null);
                        setPhoneDialogOpen(true);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Phone
                    </Button>
                  </div>

                  <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-3 gap-3 pr-0.5 scrollbar-thin content-start">
                    {selectedCustomer.phones && selectedCustomer.phones.length > 0 ? (
                      selectedCustomer.phones.map((ph) => {
                        const isSelected = selectedPhoneNum === ph.phone;
                        return (
                          <div
                            key={ph.phone}
                            onClick={() => setSelectedPhoneNum(ph.phone)}
                            className={`flex flex-col justify-between p-4 bg-white dark:bg-[#120a1c] border rounded-xl text-sm gap-2 h-fit cursor-pointer transition-all active:scale-[0.99] hover:border-indigo-500/50 ${
                              isSelected
                                ? "border-indigo-600 dark:border-indigo-400 bg-indigo-500/5 dark:bg-[#1c1829] shadow-sm"
                                : "border-slate-200 dark:border-white/5"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-extrabold text-slate-800 dark:text-white text-sm truncate">{ph.phone}</span>
                              <div className="flex items-center gap-1">
                                {ph.isDefault && (
                                  <span className="text-[9px] font-black uppercase bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/10 shrink-0">
                                    Primary
                                  </span>
                                )}
                                {isSelected && (
                                  <span className="text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/10 shrink-0">
                                    Selected
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-white/5 pt-2 mt-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => {
                                  setEditingPhone({
                                    phone: ph.phone || "",
                                    isDefault: !!ph.isDefault
                                  });
                                  setPhoneDialogOpen(true);
                                }}
                                className="text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400 cursor-pointer"
                              >
                                Edit
                              </button>
                              {selectedCustomer.phones.length > 1 && (
                                <>
                                  <span className="text-slate-300 dark:text-white/10">|</span>
                                  <button
                                    onClick={() => handleDeletePhone(ph.phone || "")}
                                    className="text-xs font-bold text-red-500 hover:underline cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-500 font-bold py-4 text-center col-span-3">No phone numbers configured.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── SubTab 2: Address book ── */}
            {profileTab === "addresses" && (
              <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
                <div className="flex justify-between items-center shrink-0">
                  <h4 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-500" /> Dispatch Locations Address Book
                  </h4>
                  <Button
                    className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold active:scale-95 transition-all flex items-center gap-1 cursor-pointer border-none"
                    onClick={() => {
                      setEditingAddress(null);
                      setAddressDialogOpen(true);
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Address
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 pr-1 scrollbar-thin min-h-0 content-start">
                  {selectedCustomer.addresses && selectedCustomer.addresses.length > 0 ? (
                    selectedCustomer.addresses.map((addr, idx) => {
                      const zone = zones.find(z => z.id === addr.deliveryZoneId);
                      const isSelected = selectedAddressIdx === idx;
                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedAddressIdx(idx)}
                          className={`p-4 rounded-2xl border flex flex-col justify-between bg-white dark:bg-[#120a1c] h-fit cursor-pointer transition-all active:scale-[0.99] hover:border-indigo-500/50 ${
                            isSelected
                              ? "border-indigo-600 dark:border-indigo-400 bg-indigo-500/5 dark:bg-[#1c1829] shadow-sm"
                              : "border-slate-200 dark:border-white/5"
                          }`}
                        >
                          <div className="flex justify-between items-start text-left">
                            <div className="space-y-1.5 flex-1 pr-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-sm text-slate-800 dark:text-white leading-snug">
                                  {addr.address}
                                </span>
                                {addr.isDefault && (
                                  <span className="text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-lg border border-indigo-500/10">
                                    Default
                                  </span>
                                )}
                                {isSelected && (
                                  <span className="text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-lg border border-emerald-500/10">
                                    Selected
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-bold flex-wrap">
                                {addr.floor && <span>Floor: {addr.floor}</span>}
                                {addr.unit && (
                                  <>
                                    <span>•</span>
                                    <span>Unit: {addr.unit}</span>
                                  </>
                                )}
                                {addr.landmark && (
                                  <>
                                    <span>•</span>
                                    <span>Sign: {addr.landmark}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                              {!addr.isDefault && (
                                <button
                                  onClick={() => handleSetPrimaryAddress(addr)}
                                  className="text-xs font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                                >
                                  Set Default
                                </button>
                              )}
                              <button
                                  onClick={() => {
                                    setEditingAddress(addr);
                                    setAddressDialogOpen(true);
                                  }}
                                className="text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400 cursor-pointer"
                              >
                                Edit
                              </button>
                              {selectedCustomer.addresses.length > 1 && (
                                <button
                                  onClick={() => handleDeleteAddress(addr)}
                                  className="text-xs font-bold text-red-500 hover:underline cursor-pointer"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
 
                          {addr.notes && (
                            <div className="mt-3 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/5 border border-amber-500/15 p-2 rounded-xl font-bold text-left">
                              Rider Note: {addr.notes}
                            </div>
                          )}
 
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 dark:border-white/10" onClick={(e) => e.stopPropagation()}>
                            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                              Zone: {zone ? `${zone.name} (+${zone.deliveryCharge.toFixed(0)} EGP Charge)` : "N/A"}
                            </span>
                            <Button
                              className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer border-none"
                              onClick={() => {
                                handleStartOrder(idx);
                              }}
                            >
                              Deliver Here
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400 text-center">
                      <MapPin className="w-10 h-10 mb-3 opacity-30 text-indigo-500" />
                      <p className="text-sm font-bold">No delivery addresses configured</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── SubTab 3: History completed invoices ── */}
            {profileTab === "history" && (
              <div className="flex-1 min-h-0 grid grid-cols-12 gap-5 overflow-hidden text-left">
                {/* Left Invoice list */}
                <div className="col-span-5 flex flex-col min-h-0 gap-3 overflow-hidden border-r border-slate-100 dark:border-white/10 pr-2">
                  <h4 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2 shrink-0">
                    <ShoppingBag className="w-4 h-4 text-indigo-500" /> Finished Checks ({customerHistory.length})
                  </h4>
                  
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                    {customerHistory.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 text-center py-6">
                        <PackageOpen className="w-10 h-10 mb-2 opacity-25 text-indigo-500" />
                        <p className="text-xs font-bold">No past invoices logged</p>
                      </div>
                    ) : (
                      customerHistory.map((chk: any) => (
                        <div
                          key={chk.id}
                          className={`p-3.5 rounded-xl border flex flex-col gap-1.5 hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors cursor-pointer ${
                            selectedHistoryCheck?.id === chk.id
                              ? "bg-indigo-500/10 border-indigo-500 dark:border-indigo-400 text-indigo-700 dark:text-indigo-200"
                              : "bg-white dark:bg-[#120a1c] border-slate-200 dark:border-white/5"
                          }`}
                          onClick={() => setSelectedHistoryCheck(chk)}
                        >
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-extrabold text-slate-800 dark:text-white">Order #{chk.chkNo}</span>
                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 font-bold">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(chk.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-black border-t border-slate-100 dark:border-white/5 pt-2 mt-1">
                            <span className="text-slate-500 font-extrabold">Paid Total</span>
                            <span className="text-indigo-650 dark:text-indigo-400 font-black text-sm">{chk.total?.toFixed(1)} EGP</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-bold mt-1">
                            <span className="text-slate-400">Status</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${
                              chk.chkStatusId === 2
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : chk.deliveryState === "Delivered"
                                ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                                : chk.deliveryState === "Dispatched"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                : chk.deliveryState === "Ready"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            }`}>
                              {chk.chkStatusId === 2 ? "Settled" : (chk.deliveryState || "Preparing")}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
 
                {/* Right Invoice Preview */}
                <div className="col-span-7 flex flex-col min-h-0 bg-slate-50 dark:bg-[#1c1829] border border-slate-200 dark:border-white/5 rounded-2xl p-4 overflow-hidden">
                  {selectedHistoryCheck ? (
                    <div className="flex flex-col h-full min-h-0 overflow-hidden">
                      {/* Check Info Header */}
                      <div className="border-b border-slate-200 dark:border-white/10 pb-3.5 shrink-0 text-left">
                        <div className="flex justify-between items-center">
                          <h4 className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400">Order #{selectedHistoryCheck.chkNo}</h4>
                          <div className="flex items-center gap-2">
                            {selectedHistoryCheck.chkStatusId === 2 ? (
                              <>
                                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] uppercase tracking-wider font-black px-2.5 py-0.5 rounded-lg">
                                  Settled
                                </span>
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                  {selectedHistoryCheck.paymentMethod || "CASH"}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className={`text-[10px] uppercase tracking-wider font-black px-2.5 py-0.5 rounded-lg border ${
                                  selectedHistoryCheck.deliveryState === "Delivered"
                                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                                    : selectedHistoryCheck.deliveryState === "Dispatched"
                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                    : selectedHistoryCheck.deliveryState === "Ready"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                }`}>
                                  {selectedHistoryCheck.deliveryState || "Preparing"}
                                </span>
                                <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg border border-rose-500/20">
                                  Unsettled
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-2 font-bold">
                          <span>Created: {new Date(selectedHistoryCheck.createdAt).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="flex-1 overflow-y-auto py-4 space-y-2.5 pr-0.5 scrollbar-thin min-h-0">
                        {selectedHistoryCheck.items && selectedHistoryCheck.items.length > 0 ? (
                          selectedHistoryCheck.items.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between items-start text-sm border-b border-slate-100 dark:border-white/5 pb-2.5">
                              <div>
                                <span className="font-extrabold text-slate-900 dark:text-white">{item.qty}x</span>
                                <span className="ml-2 font-bold text-slate-700 dark:text-slate-300">{item.itemName}</span>
                                {item.modifiers && item.modifiers.length > 0 && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 pl-5 mt-1 font-semibold">
                                    + {item.modifiers.map((m: any) => m.modifierName).join(", ")}
                                  </p>
                                )}
                              </div>
                              <span className="font-black text-slate-800 dark:text-white">{((item.itemPrice ?? item.price ?? 0) * item.qty).toFixed(1)}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-500 text-center py-4 font-bold">No items found.</p>
                        )}
                      </div>

                      {/* Financial breakdown */}
                      <div className="border-t border-slate-200 dark:border-white/10 pt-3.5 space-y-2 shrink-0 text-xs font-bold text-slate-500 dark:text-slate-400">
                        <div className="flex justify-between">
                          <span>Items Value</span>
                          <span className="text-slate-800 dark:text-white">{(selectedHistoryCheck.totalItemsValue || 0).toFixed(1)} EGP</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Delivery Charge</span>
                          <span className="text-slate-800 dark:text-white">{(selectedHistoryCheck.deliveryCharge || 0).toFixed(1)} EGP</span>
                        </div>
                        {selectedHistoryCheck.discount > 0 && (
                          <div className="flex justify-between text-rose-500">
                            <span>Discount</span>
                            <span>-{(selectedHistoryCheck.discount || 0).toFixed(1)} EGP</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-black text-slate-800 dark:text-white border-t border-slate-200 dark:border-white/10 pt-3 mt-1">
                          <span>Total Ticket</span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-black text-base">{(selectedHistoryCheck.total || 0).toFixed(1)} EGP</span>
                        </div>
                      </div>

                      {/* Re-order - Oversized h-14 button */}
                      <div className="pt-4 shrink-0">
                        <Button
                          onClick={() => {
                            const addrIndex = selectedCustomer.addresses.findIndex(
                              a => a.address === selectedHistoryCheck.deliveryAddress
                            );
                            const finalAddrIndex = addrIndex !== -1 ? addrIndex : 0;
                            
                            navigate("/delivery/order", {
                              state: {
                                customer: selectedCustomer,
                                addressIndex: finalAddrIndex,
                                reorderItems: selectedHistoryCheck.items || []
                              }
                            });
                          }}
                          className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all border-none cursor-pointer shadow-sm"
                        >
                          <ShoppingBag className="w-5 h-5 text-white" />
                          Re-order items 🛵
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 text-center py-6">
                      <ShoppingBag className="w-12 h-12 mb-2 opacity-30 text-indigo-500" />
                      <p className="text-xs font-bold">Select invoice to view details</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── SubTab 4: Live Tracker timeline ── */}
            {profileTab === "timeline" && (
              <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto pr-1 scrollbar-thin text-left">
                {customerUnsettledChecks.length === 0 && !selectedHistoryCheck ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 text-center py-6">
                    <Clock className="w-12 h-12 mb-2 opacity-30 text-indigo-500" />
                    <p className="text-xs font-bold">No active delivery orders for this customer</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Render active unsettled checks */}
                    {customerUnsettledChecks.map((chk: any) => {
                      const isExpanded = expandedCheckId === chk.id;
                      return (
                        <div
                          key={chk.id}
                          className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-[#120a1c]"
                        >
                          {/* Card Header */}
                          <div
                            onClick={() => setExpandedCheckId(isExpanded ? null : chk.id)}
                            className="flex justify-between items-center p-4 bg-slate-50 dark:bg-[#1c1829] cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-all select-none"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">Order #{chk.chkNo}</span>
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                                chk.deliveryState === "Delivered"
                                  ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                                  : chk.deliveryState === "Dispatched"
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                  : chk.deliveryState === "Ready"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              }`}>
                                {chk.deliveryState || "Preparing"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{chk.total?.toFixed(1)} EGP</span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </div>

                          {/* Card Body with timeline */}
                          {isExpanded && (
                            <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-[#0c0615] text-left animate-in fade-in duration-150">
                              <div className="flex justify-between items-center bg-slate-50 dark:bg-[#1c1829] border border-slate-200 dark:border-white/5 p-4 rounded-2xl shrink-0 shadow-sm flex-wrap gap-3 mb-6">
                                <div>
                                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Ticket Number</span>
                                  <span className="text-base font-black text-indigo-600 dark:text-indigo-400">Order #{chk.chkNo}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 block uppercase tracking-wider"> Rider / Location State</span>
                                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                    {chk.deliveryState || "Preparing"}
                                    {chk.deliveryPilotId && ` (${pilots.find(p => p.id === chk.deliveryPilotId)?.name || "Pilot"})`}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Subtotal Paid</span>
                                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{chk.total?.toFixed(1)} EGP</span>
                                </div>
                                <div className="flex items-center">
                                  <Button
                                    onClick={() => {
                                      navigate("/delivery/order", {
                                        state: { checkId: chk.id }
                                      });
                                    }}
                                    className="h-12 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer border-none shadow-sm"
                                  >
                                    Open Order
                                  </Button>
                                </div>
                              </div>

                              {/* Timeline Tracker */}
                              <div className="relative pl-10 py-2 space-y-8 min-h-0">
                                <div className="absolute left-[13px] top-4 bottom-4 w-0.5 bg-slate-200 dark:bg-white/10"></div>

                                {/* Step 1: Created */}
                                <div className="relative">
                                  <div className="absolute -left-[32px] top-1.5 w-6 h-6 rounded-full bg-emerald-500 border-4 border-white dark:border-[#151120] flex items-center justify-center shadow-sm">
                                    <Check className="w-3.5 h-3.5 text-white" />
                                  </div>
                                  <div>
                                    <div className="flex justify-between text-sm font-bold text-slate-800 dark:text-white">
                                      <span>Order Submitted</span>
                                      <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">{new Date(chk.createdAt).toLocaleTimeString()}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Ticket submitted to dispatch database</p>
                                  </div>
                                </div>

                                {/* Step 2: Kitchen Prep */}
                                {(() => {
                                  const isDone = chk.deliveryState === "Ready" || chk.deliveryState === "Dispatched" || chk.deliveryState === "Delivered" || chk.chkStatusId === 2 || !!chk.closeTime;
                                  const isActive = !isDone;
                                  return (
                                    <div className="relative">
                                      <div className={`absolute -left-[32px] top-1.5 w-6 h-6 rounded-full border-4 border-white dark:border-[#151120] flex items-center justify-center shadow-sm ${
                                        isDone ? "bg-emerald-500" : isActive ? "bg-blue-500 animate-pulse" : "bg-slate-300 dark:bg-[#252036]"
                                      }`}>
                                        {isDone && <Check className="w-3.5 h-3.5 text-white" />}
                                      </div>
                                      <div>
                                        <div className="flex justify-between text-sm font-bold text-slate-800 dark:text-white">
                                          <span>Kitchen Preparation</span>
                                          {isActive && <span className="text-xs text-blue-600 dark:text-blue-400 font-black">Cooking</span>}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Items are actively cooking in kitchen</p>
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Step 3: Marked Ready */}
                                {(() => {
                                  const isDone = chk.deliveryState === "Dispatched" || chk.deliveryState === "Delivered" || chk.chkStatusId === 2 || !!chk.closeTime;
                                  const isActive = chk.deliveryState === "Ready";
                                  return (
                                    <div className="relative">
                                      <div className={`absolute -left-[32px] top-1.5 w-6 h-6 rounded-full border-4 border-white dark:border-[#151120] flex items-center justify-center shadow-sm ${
                                        isDone ? "bg-emerald-500" : isActive ? "bg-blue-500 animate-pulse" : "bg-slate-300 dark:bg-[#252036]"
                                      }`}>
                                        {isDone && <Check className="w-3.5 h-3.5 text-white" />}
                                      </div>
                                      <div>
                                        <div className="flex justify-between text-sm font-bold text-slate-800 dark:text-white">
                                          <span>Meal Prepared & Boxed</span>
                                          {isActive && <span className="text-xs text-blue-600 dark:text-blue-400 font-black">Bay Ready</span>}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Meal packaged and marked ready in dispatch bay</p>
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Step 4: Out on Road */}
                                {(() => {
                                  const isDone = chk.deliveryState === "Delivered" || chk.chkStatusId === 2 || !!chk.closeTime;
                                  const isActive = chk.deliveryState === "Dispatched" && !isDone;
                                  return (
                                    <div className="relative">
                                      <div className={`absolute -left-[32px] top-1.5 w-6 h-6 rounded-full border-4 border-white dark:border-[#151120] flex items-center justify-center shadow-sm ${
                                        isDone ? "bg-emerald-500" : isActive ? "bg-amber-500 animate-pulse" : "bg-slate-300 dark:bg-[#252036]"
                                      }`}>
                                        {isDone && <Check className="w-3.5 h-3.5 text-white" />}
                                      </div>
                                      <div>
                                        <div className="flex justify-between text-sm font-bold text-slate-800 dark:text-white">
                                          <span>Out with Rider</span>
                                          {(isActive || isDone) && chk.dispatchedAt && (
                                            <span className={`text-xs font-black flex items-center gap-1 ${isDone ? "text-slate-500 dark:text-slate-400" : "text-amber-600 dark:text-amber-400 animate-pulse"}`}>
                                              Road Transit ({formatElapsedHMS(
                                                chk.dispatchedAt,
                                                isDone && chk.updatedAt ? chk.updatedAt : undefined
                                              )})
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                                          {chk.dispatchedAt 
                                            ? `Pilot dispatched at ${new Date(chk.dispatchedAt).toLocaleTimeString()}`
                                            : "Awaiting pilot assignment and dispatch check-out"
                                          }
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Step 5: Delivered */}
                                {(() => {
                                  const isDone = chk.deliveryState === "Delivered" || chk.chkStatusId === 2 || !!chk.closeTime;
                                  return (
                                    <div className="relative">
                                      <div className={`absolute -left-[32px] top-1.5 w-6 h-6 rounded-full border-4 border-white dark:border-[#151120] flex items-center justify-center shadow-sm ${
                                        isDone ? "bg-emerald-500" : "bg-slate-300 dark:bg-[#252036]"
                                      }`}>
                                        {isDone && <Check className="w-3.5 h-3.5 text-white" />}
                                      </div>
                                      <div>
                                        <div className="flex justify-between text-sm font-bold text-slate-800 dark:text-white">
                                          <span>Delivered</span>
                                          {isDone && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-black">Completed</span>}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                          {chk.chkStatusId === 2 || !!chk.closeTime
                                            ? `Delivered & Settled via ${chk.paymentMethod?.toUpperCase() || "CASH"}`
                                            : isDone
                                            ? "Marked as Delivered (Awaiting settlement)"
                                            : "Awaiting pilot delivery & return"}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Render selected historical check if any */}
                    {selectedHistoryCheck && !customerUnsettledChecks.some(c => c.id === selectedHistoryCheck.id) && (
                      <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-[#120a1c]">
                        <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-[#1c1829] select-none">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-black text-slate-600 dark:text-slate-300">Historical Order #{selectedHistoryCheck.chkNo}</span>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                              Settled
                            </span>
                          </div>
                          <span className="text-xs font-black text-slate-500">{selectedHistoryCheck.total?.toFixed(1)} EGP</span>
                        </div>
                        <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-[#0c0615] text-left">
                          <div className="pl-10 space-y-8 relative">
                            <div className="absolute left-[13px] top-4 bottom-4 w-0.5 bg-slate-200 dark:bg-white/10"></div>
                            {/* History Timeline */}
                            <div className="relative">
                              <div className="absolute -left-[32px] top-1.5 w-6 h-6 rounded-full bg-emerald-500 border-4 border-white dark:border-[#151120] flex items-center justify-center">
                                <Check className="w-3.5 h-3.5 text-white" />
                              </div>
                              <div>
                                <div className="flex justify-between text-sm font-bold text-slate-800 dark:text-white">
                                  <span>Order Settled & Closed</span>
                                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">{new Date(selectedHistoryCheck.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Settle Method: {selectedHistoryCheck.paymentMethod || "CASH"}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sub-modals for phone & address edits */}
      <PhoneDialog
        open={phoneDialogOpen}
        onOpenChange={setPhoneDialogOpen}
        editingPhone={editingPhone}
        onSave={onSavePhone}
      />

      <AddressDialog
        open={addressDialogOpen}
        onOpenChange={setAddressDialogOpen}
        editingAddress={editingAddress}
        zones={zones}
        onSave={onSaveAddress}
      />
    </div>
  );
}
