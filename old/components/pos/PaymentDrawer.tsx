import { useEffect, useState, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Search, Banknote, CreditCard, UserCheck, Layers, Award, User, ShieldCheck } from "lucide-react";
import { PaymentDrawerProps, PaymentFormData } from "./PaymentDrawer.types";
import { paymentSchema } from "../../schema/payment.schema";
import { NumpadPopup } from "./NumpadPopup";
import { useQuery } from "@tanstack/react-query";
import { fetchCustsListForBranch } from "../../services/reportsApi";
import { useBranch } from "../../context/BranchContext";

const CURRENCIES = ["Egyptian Pound (EGP)", "US Dollar (USD)", "Euro (EUR)"];
const CARD_TYPES = ["Visa", "Mastercard", "Amex"];

export default function PaymentDrawer({ isOpen, onClose, checkTotal, tableNumber, onConfirm, items, tax }: PaymentDrawerProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [activeNumpad, setActiveNumpad] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLInputElement | null>(null);
  const [isCustModalOpen, setIsCustModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<number | null>(null);

  const { selectedBranch } = useBranch();
  const branchId = selectedBranch?.id;

  const drawerRef = useRef<HTMLDivElement>(null);
  const roundedTotal = Number(checkTotal.toFixed(2));

  // Fetch customers list via branch-specific endpoint (reports.sales permission — works for POS users)
  const { data: custsData } = useQuery({
    queryKey: ["reports", "custs-list", branchId],
    queryFn: () => fetchCustsListForBranch(branchId!),
    enabled: isOpen && branchId != null,
  });

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => setShouldRender(false), 500);
      return () => clearTimeout(timer);
    } else {
      setShouldRender(true);
    }
  }, [isOpen]);

  const { register, control, handleSubmit, setValue, reset, formState: { errors, isValid } } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema) as any,
    mode: "onChange",
    defaultValues: {
      paymentMethod: "cash",
      cash: roundedTotal,
      currency: "Egyptian Pound (EGP)",
      customerName: "Cash Customer",
      clAmount: 0,
      clNote: "",
      visaAmount: 0,
      visaNo: "",
      cardType: "Visa",
      tips: 0,
      isComp: false,
    }
  });

  // Re-sync default to checkTotal when it changes and drawer opens
  useEffect(() => {
    if (isOpen) {
      reset({
        paymentMethod: "cash",
        cash: roundedTotal,
        currency: "Egyptian Pound (EGP)",
        customerName: "Cash Customer",
        clAmount: 0,
        clNote: "",
        visaAmount: 0,
        visaNo: "",
        cardType: "Visa",
        tips: 0,
        isComp: false,
      });
      setActiveNumpad(null);
    }
  }, [roundedTotal, isOpen, reset]);

  const paymentMethod = useWatch({ control, name: "paymentMethod" }) || "cash";
  const cash = Number(useWatch({ control, name: "cash" })) || 0;
  const clAmount = Number(useWatch({ control, name: "clAmount" })) || 0;
  const visaAmount = Number(useWatch({ control, name: "visaAmount" })) || 0;
  const tips = Number(useWatch({ control, name: "tips" })) || 0;
  const isComp = useWatch({ control, name: "isComp" }) || false;
  const customerName = useWatch({ control, name: "customerName" }) || "Cash Customer";

  // Watch overrides from form
  const formDiscountAmount = useWatch({ control, name: "discountAmount" }) || 0;
  const formChkStut = useWatch({ control, name: "chkStut" });

  // Calculate dynamic displayed total based on selected customer type
  const netPriceOnly = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const displayedTotal = Number((formChkStut === 8 
    ? netPriceOnly
    : formDiscountAmount > 0 
      ? (roundedTotal - formDiscountAmount)
      : roundedTotal
  ).toFixed(2));

  // Watch Method changes to auto-fill
  const prevMethodRef = useRef(paymentMethod);
  useEffect(() => {
    if (prevMethodRef.current !== paymentMethod) {
      if (paymentMethod === "cash") {
        setValue("cash", displayedTotal, { shouldValidate: true });
        setValue("visaAmount", 0, { shouldValidate: true });
        setValue("clAmount", 0, { shouldValidate: true });
      } else if (paymentMethod === "visa") {
        setValue("visaAmount", displayedTotal, { shouldValidate: true });
        setValue("cash", 0, { shouldValidate: true });
        setValue("clAmount", 0, { shouldValidate: true });
      } else if (paymentMethod === "cl") {
        setValue("clAmount", displayedTotal, { shouldValidate: true });
        setValue("cash", 0, { shouldValidate: true });
        setValue("visaAmount", 0, { shouldValidate: true });
      } else if (paymentMethod === "mixed") {
        setValue("visaAmount", 0, { shouldValidate: true });
        setValue("cash", displayedTotal, { shouldValidate: true });
        setValue("clAmount", 0, { shouldValidate: true });
      }
      prevMethodRef.current = paymentMethod;
    }
  }, [paymentMethod, displayedTotal, setValue]);

  // Smart mixed auto-fill Cash
  useEffect(() => {
    if (paymentMethod === "mixed" || paymentMethod === "cash") {
      const autoCash = Math.max(0, displayedTotal - visaAmount - clAmount);
      if (cash !== autoCash) {
        setValue("cash", parseFloat(autoCash.toFixed(2)), { shouldValidate: true });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visaAmount, clAmount, displayedTotal, paymentMethod]);

  // Outside click for active numpad
  useEffect(() => {
    if (!activeNumpad) return;
    const handleOutside = () => {
      setActiveNumpad(null);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [activeNumpad]);

  const totalPaid = cash + clAmount + visaAmount;
  const remaining = displayedTotal - totalPaid;
  const changeDue = Math.max(0, cash - Math.max(0, displayedTotal - clAmount - visaAmount));
  const isPaid = totalPaid >= displayedTotal;

  const onSubmit = (data: PaymentFormData) => {
    if (isPaid) {
      onConfirm(data);
    }
  };

  const toggleComp = () => {
    const nextComp = !isComp;
    setValue("isComp", nextComp, { shouldValidate: true });
    if (nextComp) {
      setValue("tips", 0, { shouldValidate: true });
    }
  };

  if (!shouldRender) return null;

  const getActiveRef = () => {
    return { current: anchorEl };
  };

  const getActiveValue = () => {
    switch (activeNumpad) {
      case "cash": return cash.toString();
      case "visaAmount": return visaAmount.toString();
      case "clAmount": return clAmount.toString();
      case "tips": return tips.toString();
      default: return "";
    }
  };

  const handleNumpadChange = (valStr: string) => {
    if (activeNumpad) {
      setValue(activeNumpad as any, parseFloat(valStr) || 0, { shouldValidate: true });
    }
  };

  const handleSelectCustomer = (customer: any) => {
    setValue("customerId", customer.code, { shouldValidate: true });
    setValue("customerName", customer.name, { shouldValidate: true });

    const isOwner = customer.kind === 1;
    // const isStaff = customer.kind === 2;
    const isOfficer = customer.kind === 3;

    if (isOfficer) {
      // Officer check: net price only, no service charge, no tax, no discount
      setValue("clAmount", parseFloat(netPriceOnly.toFixed(2)), { shouldValidate: true });
      setValue("chkStut", 8, { shouldValidate: true });
      setValue("tax", 0, { shouldValidate: true });
      setValue("service", 0, { shouldValidate: true });
      setValue("discountAmount", 0, { shouldValidate: true });
      setValue("discountPrsn", 0, { shouldValidate: true });
    } else {
      // CL check: Owner CL (status 4) or Staff CL (status 10)
      const targetStut = isOwner ? 4 : 10;
      setValue("chkStut", targetStut, { shouldValidate: true });

      // Apply customer discount if present
      const discountPercent = Number(customer.discount) || 0;
      if (discountPercent > 0) {
        const discountVal = checkTotal * (discountPercent / 100);
        const adjustedTotal = checkTotal - discountVal;
        setValue("clAmount", parseFloat(adjustedTotal.toFixed(2)), { shouldValidate: true });
        setValue("discountAmount", parseFloat(discountVal.toFixed(2)), { shouldValidate: true });
        setValue("discountPrsn", discountPercent, { shouldValidate: true });
      } else {
        setValue("clAmount", roundedTotal, { shouldValidate: true });
        setValue("discountAmount", 0, { shouldValidate: true });
        setValue("discountPrsn", 0, { shouldValidate: true });
      }
      // Revert normal tax and service
      setValue("tax", tax, { shouldValidate: true });
      setValue("service", undefined, { shouldValidate: true });
    }

    setIsCustModalOpen(false);
  };

  const handleClearCustomer = () => {
    setValue("customerId", undefined, { shouldValidate: true });
    setValue("customerName", "Cash Customer", { shouldValidate: true });
    setValue("clAmount", roundedTotal, { shouldValidate: true });
    setValue("chkStut", undefined, { shouldValidate: true });
    setValue("discountAmount", 0, { shouldValidate: true });
    setValue("discountPrsn", 0, { shouldValidate: true });
    setValue("tax", tax, { shouldValidate: true });
    setValue("service", undefined, { shouldValidate: true });
  };

  // Filter kinds 1, 2, and 3
  const allowedCustomers = (custsData || []).filter(
    (c: any) => c.kind === 1 || c.kind === 2 || c.kind === 3
  );

  const searchedCustomers = allowedCustomers.filter((c: any) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toString().includes(searchQuery);
    const matchesKind = kindFilter === null || c.kind === kindFilter;
    return matchesSearch && matchesKind;
  });

  const METHODS = [
    { id: "cash", label: "Cash", icon: Banknote },
    { id: "visa", label: "Visa", icon: CreditCard },
    { id: "cl", label: "CL", icon: UserCheck },
    { id: "mixed", label: "Mixed", icon: Layers }
  ];

  return (
    <>
      <div 
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-500 ease-in-out ${isOpen ? "opacity-100" : "opacity-0"}`} 
        onClick={onClose} 
      />

      <div 
        ref={drawerRef}
        className={`fixed inset-y-0 right-0 z-50 w-full md:w-[900px] text-black bg-white dark:bg-gray-800 shadow-2xl flex flex-row transition-transform duration-500 ease-in-out transform ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Left Panel - Confirmation */}
        <div className="flex-1 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex-col min-h-0 hidden md:flex">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Confirmation</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Table {tableNumber}</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {items && items.length > 0 ? items.map((item, i) => (
              <div key={i} className="flex justify-between items-start gap-4 pb-4 border-b border-gray-100 dark:border-gray-700/50 last:border-0 last:pb-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="bg-gray-200 dark:bg-gray-700 text-xs px-2 py-0.5 rounded font-bold">{item.quantity}</span>
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{item.name}</p>
                  </div>
                  {item.note && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-7">{item.note}</p>}
                </div>
                <div className="font-mono text-gray-900 dark:text-white font-semibold flex-shrink-0">
                  {(item.quantity * item.unitPrice).toFixed(2)}
                </div>
              </div>
            )) : (
              <p className="text-gray-500 dark:text-gray-400 italic text-center py-10">No items available</p>
            )}
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shrink-0">
            <div className="space-y-2">
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>Subtotal (Net Price Only)</span>
                <span className="font-mono">{netPriceOnly.toFixed(2)}</span>
              </div>
              {formChkStut !== 8 && tax !== undefined && (
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Tax</span>
                  <span className="font-mono">{tax.toFixed(2)}</span>
                </div>
              )}
              {formDiscountAmount > 0 && (
                <div className="flex justify-between text-red-500 dark:text-red-400">
                  <span>Discount</span>
                  <span className="font-mono">-{formDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-3 mt-3 border-t border-gray-100 dark:border-gray-700 text-lg">
                <span className="font-bold text-gray-900 dark:text-white">Total</span>
                <span className="font-mono font-bold text-brand-600 dark:text-brand-400">{displayedTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Payment */}
        <div className="w-full md:w-[440px] flex flex-col bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <div>
              <h2 className="text-xl font-bold dark:text-white">Payment</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{METHODS.length} payment methods available</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-6">
              
              {/* Selector */}
              <div className="grid grid-cols-4 gap-2 mb-6">
                {METHODS.map(method => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setValue("paymentMethod", method.id as any, { shouldValidate: true })}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all ${paymentMethod === method.id ? "bg-brand-500 text-white border-brand-500 shadow-md" : "bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                    >
                      <Icon size={20} strokeWidth={2.5} className="mb-1" />
                      <span className="text-xs font-semibold">{method.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-6">
                
                {/* MIXED OR VISA */}
                {(paymentMethod === "visa" || paymentMethod === "mixed") && (
                  <div className="p-4 rounded-xl border-l-[3px] border-l-brand-500 bg-white dark:bg-gray-800 border-y border-r border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-20 text-sm font-bold dark:text-gray-200">Visa</span>
                        <input 
                          type="text" 
                          inputMode="none"
                          readOnly
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveNumpad("visaAmount");
                            setAnchorEl(e.currentTarget);
                          }}
                          onFocus={(e) => {
                            e.target.blur();
                            if (paymentMethod === "mixed") {
                              const fullVisa = parseFloat(Math.max(0, displayedTotal - clAmount).toFixed(2));
                              setValue("visaAmount", fullVisa, { shouldValidate: true });
                            }
                          }}
                          value={visaAmount.toFixed(2)}
                          {...register("visaAmount", { valueAsNumber: true })}
                          className={`w-28 text-right font-mono p-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer ${activeNumpad === "visaAmount" ? "border-brand-500 ring-2 ring-brand-500/20 dark:border-brand-500" : "dark:bg-gray-700 dark:border-gray-600 dark:text-white"}`} 
                        />
                        <select 
                          {...register("cardType")}
                          className="flex-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                        >
                          {CARD_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-20 text-sm font-bold text-gray-500 dark:text-gray-400">Card No</div>
                        <div className="flex-1">
                          <input 
                            type="text"
                            placeholder="**** **** **** ****"
                            maxLength={20}
                            {...register("visaNo")}
                            className={`w-full p-2 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none ${errors.visaNo ? 'border-red-500 focus:ring-red-500 dark:border-red-500' : 'dark:border-gray-600'}`} 
                          />
                          {errors.visaNo && <p className="text-red-500 text-xs mt-1">{errors.visaNo.message}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* MIXED DIVIDER */}
                {paymentMethod === "mixed" && (
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">AND</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                  </div>
                )}

                {/* MIXED OR CASH */}
                {(paymentMethod === "cash" || paymentMethod === "mixed") && (
                  <div className="p-4 rounded-xl border-l-[3px] border-l-brand-500 bg-white dark:bg-gray-800 border-y border-r border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-20 text-sm font-bold dark:text-gray-200">Cash</span>
                        <input 
                          type="text"
                          inputMode="none"
                          readOnly
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveNumpad("cash");
                            setAnchorEl(e.currentTarget);
                          }}
                          onFocus={(e) => e.target.blur()}
                          value={cash.toFixed(2)}
                          {...register("cash", { valueAsNumber: true })}
                          className={`w-28 text-right font-mono p-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer ${activeNumpad === "cash" ? "border-brand-500 ring-2 ring-brand-500/20 dark:border-brand-500" : "dark:bg-gray-700 dark:border-gray-600 dark:text-white"}`} 
                        />
                        <select 
                          {...register("currency")}
                          className="flex-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                        >
                          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="w-20 text-sm font-bold text-gray-500 dark:text-gray-400">Change</span>
                        <div className={`flex-1 p-2 text-right font-mono font-bold rounded-lg ${changeDue > 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}>
                          {changeDue.toFixed(2)}
                        </div>
                        <button
                          type="button"
                          disabled={changeDue === 0}
                          onClick={() => {
                            setValue("tips", tips + changeDue, { shouldValidate: true });
                            setValue("cash", cash - changeDue, { shouldValidate: true });
                          }}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${changeDue > 0 ? "bg-brand-100 text-brand-700 hover:bg-brand-200 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-900/60" : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed"}`}
                        >
                          As Tip
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* CL ONLY */}
                {paymentMethod === "cl" && (
                  <div className="p-4 rounded-xl border-l-[3px] border-l-brand-500 bg-white dark:bg-gray-800 border-y border-r border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex flex-col gap-3">
                      
                      <div className="flex items-center gap-3">
                        <span className="w-20 text-sm font-bold dark:text-gray-200">Customer</span>
                        <div className="flex-1 flex gap-2">
                          <input 
                            type="text" 
                            readOnly 
                            {...register("customerName")}
                            className="flex-1 p-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 outline-none" 
                          />
                          {customerName !== "Cash Customer" && (
                            <button 
                              type="button" 
                              onClick={handleClearCustomer}
                              className="px-2.5 border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-xs font-bold transition-all"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setIsCustModalOpen(true)} 
                          className="p-2 border border-brand-500 text-brand-600 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/30 dark:text-brand-400"
                        >
                          <Search size={20} />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`w-20 text-sm font-bold ${customerName === "Cash Customer" ? "text-gray-400 dark:text-gray-600" : "dark:text-gray-200"}`}>CL Amt</span>
                        <input 
                          type="text" 
                          inputMode="none"
                          readOnly
                          disabled={customerName === "Cash Customer"}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (customerName !== "Cash Customer") {
                              setActiveNumpad("clAmount");
                              setAnchorEl(e.currentTarget);
                            }
                          }}
                          onFocus={(e) => e.target.blur()}
                          value={clAmount.toFixed(2)}
                          {...register("clAmount", { valueAsNumber: true })}
                          className={`w-28 text-right font-mono p-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer ${customerName === "Cash Customer" ? "bg-gray-100 border-gray-200 text-gray-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500 cursor-not-allowed" : activeNumpad === "clAmount" ? "border-brand-500 ring-2 ring-brand-500/20 dark:border-brand-500" : "dark:bg-gray-700 dark:border-gray-600 dark:text-white"}`} 
                        />
                        <input 
                          type="text" 
                          placeholder="Note / Ref"
                          disabled={customerName === "Cash Customer"}
                          {...register("clNote")}
                          className={`flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none ${customerName === "Cash Customer" ? "bg-gray-100 border-gray-200 text-gray-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500 cursor-not-allowed" : "dark:bg-gray-700 dark:border-gray-600 dark:text-white"}`} 
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* universally available Tips Section */}
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="w-20 text-sm font-bold dark:text-gray-200">Tips</span>
                    <input 
                      type="text" 
                      inputMode="none"
                      readOnly
                      disabled={isComp}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isComp) {
                          setActiveNumpad("tips");
                          setAnchorEl(e.currentTarget);
                        }
                      }}
                      onFocus={(e) => e.target.blur()}
                      value={tips.toFixed(2)}
                      {...register("tips", { valueAsNumber: true })}
                      className={`w-28 text-right font-mono p-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer ${isComp ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-not-allowed' : activeNumpad === "tips" ? "border-brand-500 ring-2 ring-brand-500/20 dark:border-brand-500" : 'bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white'}`} 
                    />
                    <div className="flex-1 flex justify-end">
                      <button 
                        type="button" 
                        onClick={toggleComp}
                        className={`px-4 py-2 text-sm rounded-lg font-bold transition-colors ${isComp ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"}`}
                      >
                        {isComp ? "Is Comp" : "Comp"}
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Totals Summary Footer */}
            <div className="shrink-0 p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <div className="space-y-1.5 mb-5">
                <div className="flex justify-between text-gray-500 dark:text-gray-400 text-sm">
                  <span>Check Total</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">{displayedTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400 text-sm">
                  <span>Amount Paid</span>
                  <span className="font-mono">{totalPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="font-bold text-gray-900 dark:text-white">Remaining</span>
                  <span className={`font-mono font-bold text-lg ${remaining > 0 ? "text-red-500" : "text-emerald-500"}`}>
                    {remaining > 0 ? remaining.toFixed(2) : "0.00"}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={!isPaid || !isValid}
                  className="flex-[2] py-3 px-4 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all"
                >
                  Confirm Payment
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Customer Lookup Dialog */}
      {isCustModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Select Customer</h3>
              </div>
              <button 
                onClick={() => setIsCustModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 pb-3 bg-gray-50/50 dark:bg-gray-900/50">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Search by code or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-all text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Kind Filter Radio Buttons */}
            <div className="px-4 pb-3 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                {[
                  { label: "All", value: null },
                  { label: "Owner CL", value: 1, icon: Award, color: "amber" },
                  { label: "Staff CL", value: 2, icon: User, color: "emerald" },
                  { label: "Officer", value: 3, icon: ShieldCheck, color: "brand" },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const isActive = kindFilter === opt.value;
                  const colorMap: Record<string, string> = {
                    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-400",
                    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-400",
                    brand: "bg-brand-500/10 text-brand-700 dark:text-brand-400 border-brand-400",
                  };
                  const activeClass = opt.color
                    ? colorMap[opt.color]
                    : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white";
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => setKindFilter(opt.value as number | null)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        isActive
                          ? activeClass
                          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500"
                      }`}
                    >
                      {Icon && <Icon size={12} />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Customer List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {searchedCustomers.length > 0 ? (
                searchedCustomers.map((cust: any) => {
                  const isOwner = cust.kind === 1;
                  const isStaff = cust.kind === 2;
                  const isOfficer = cust.kind === 3;
                  
                  return (
                    <button
                      key={cust.code}
                      type="button"
                      onClick={() => handleSelectCustomer(cust)}
                      className="w-full text-left p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-gray-100 dark:border-gray-800 hover:border-brand-500/30 rounded-2xl transition-all shadow-sm flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400">
                            #{cust.code}
                          </span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {cust.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                          {isOwner && (
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full">
                              <Award size={12} /> Owner CL
                            </span>
                          )}
                          {isStaff && (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              <User size={12} /> Staff CL
                            </span>
                          )}
                          {isOfficer && (
                            <span className="flex items-center gap-1 text-brand-600 dark:text-brand-400 font-semibold bg-brand-500/10 px-2 py-0.5 rounded-full">
                              <ShieldCheck size={12} /> Officer
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {cust.discount > 0 && (
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded-lg">
                            {cust.discount}% Disc
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                  <Search size={32} className="mx-auto text-gray-300 dark:text-gray-700 mb-2" />
                  <p className="text-sm font-semibold">No customers found</p>
                  <p className="text-xs mt-1">Try another name or search term</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <NumpadPopup
        isOpen={activeNumpad !== null}
        value={getActiveValue()}
        onChange={handleNumpadChange}
        onClose={() => setActiveNumpad(null)}
        anchorRef={getActiveRef()}
      />
    </>
  );
}
