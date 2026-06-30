import { useEffect, useState, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Search, Banknote, CreditCard, UserCheck, Layers, Award, User, ShieldCheck, Delete } from "lucide-react";
import type { PaymentDrawerProps, PaymentFormData } from "./PaymentDrawer.types";
import { paymentSchema } from "./PaymentDrawer.types";
import { useCustomers } from "@/hooks/api/useChecksApi";
import { SupervisorOverrideDialog } from "./SupervisorOverrideDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { api } from "@/lib/api";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";

const METHODS = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "visa", label: "Visa", icon: CreditCard },
  { id: "cl", label: "CL", icon: UserCheck },
  { id: "mixed", label: "Mixed", icon: Layers }
];

export default function PaymentDrawer({
  isOpen,
  onClose,
  checkTotal,
  tableNumber,
  onConfirm,
  items,
  tax,
  serviceCharge,
  deliveryCharge,
  discountAmount,
  discountPrsn,
  printCount
}: PaymentDrawerProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isCustModalOpen, setIsCustModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const drawerRef = useRef<HTMLDivElement>(null);

  // Food Test State
  const [isFoodTest, setIsFoodTest] = useState(false);

  // Comp check confirmation state
  const [compConfirmOpen, setCompConfirmOpen] = useState(false);

  // Supervisor states for Comp Check / CL unlock
  const [supervisorOpen, setSupervisorOpen] = useState(false);
  const [supervisorError, setSupervisorError] = useState<string | null>(null);
  const [supervisorLoading, setSupervisorLoading] = useState(false);
  const [clUnlockActive, setClUnlockActive] = useState(false);
  const [clAuthorized, setClAuthorized] = useState(false);

  // Keypad focus state
  const [activeInput, setActiveInput] = useState<"cash" | "visaAmount" | "clAmount" | "tips">("cash");
  const [keypadString, setKeypadString] = useState("");
  const [isFirstType, setIsFirstType] = useState(true);

  const roundedTotal = Number(checkTotal.toFixed(2));
  const { data: custsData } = useCustomers();
  const { hasPermission } = usePermissions();

  const hasClPermission = hasPermission("check.officer:close") || clAuthorized;

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => setShouldRender(false), 500);
      return () => clearTimeout(timer);
    } else {
      setShouldRender(true);
    }
  }, [isOpen]);

  const { control, handleSubmit, setValue, reset } = useForm<PaymentFormData>({
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
      discountAmount: discountAmount || 0,
      discountPrsn: discountPrsn || 0,
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
        discountAmount: discountAmount || 0,
        discountPrsn: discountPrsn || 0,
      });
      setActiveInput("cash");
      setKeypadString(roundedTotal.toString());
      setIsFirstType(true);
      setClAuthorized(false);
      setIsFoodTest(false);
    }
  }, [roundedTotal, isOpen, reset, discountAmount, discountPrsn]);

  const paymentMethod = useWatch({ control, name: "paymentMethod" }) || "cash";
  const cash = Number(useWatch({ control, name: "cash" })) || 0;
  const clAmount = Number(useWatch({ control, name: "clAmount" })) || 0;
  const visaAmount = Number(useWatch({ control, name: "visaAmount" })) || 0;
  const tips = Number(useWatch({ control, name: "tips" })) || 0;
  const isComp = useWatch({ control, name: "isComp" }) || false;
  const customerName = useWatch({ control, name: "customerName" }) || "Cash Customer";
  const customerId = useWatch({ control, name: "customerId" });

  const formDiscountAmount = useWatch({ control, name: "discountAmount" }) || 0;
  const formDiscountPrsn = useWatch({ control, name: "discountPrsn" }) || 0;
  const formChkStut = useWatch({ control, name: "chkStut" });

  // Calculate dynamic displayed total
  const netPriceOnly = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const displayedTotal = Number(((formChkStut === 8 || formChkStut === 11 || isFoodTest)
    ? netPriceOnly
    : formDiscountAmount > 0 
      ? (roundedTotal - formDiscountAmount)
      : roundedTotal
  ).toFixed(2));

  // Auto-focus and initialize inputs when payment method changes
  useEffect(() => {
    if (paymentMethod === "cash") {
      setActiveInput("cash");
      setValue("cash", roundedTotal, { shouldValidate: true });
      setValue("visaAmount", 0, { shouldValidate: true });
      setValue("clAmount", 0, { shouldValidate: true });
      setValue("tips", 0, { shouldValidate: true });
      setKeypadString(roundedTotal.toString());
      setIsFirstType(true);
    } else if (paymentMethod === "visa") {
      setActiveInput("visaAmount");
      setValue("cash", 0, { shouldValidate: true });
      setValue("visaAmount", roundedTotal, { shouldValidate: true });
      setValue("clAmount", 0, { shouldValidate: true });
      setValue("tips", 0, { shouldValidate: true });
      setKeypadString(roundedTotal.toString());
      setIsFirstType(true);
    } else if (paymentMethod === "cl") {
      setActiveInput("clAmount");
      setValue("cash", 0, { shouldValidate: true });
      setValue("visaAmount", 0, { shouldValidate: true });
      setValue("tips", 0, { shouldValidate: true });
      if (isFoodTest) {
        setValue("customerName", "Food Test", { shouldValidate: true });
        setValue("clAmount", parseFloat(netPriceOnly.toFixed(2)), { shouldValidate: true });
        setValue("chkStut", 11, { shouldValidate: true });
        setKeypadString(netPriceOnly.toFixed(2));
      } else if (customerName === "Cash Customer" || !customerId) {
        setValue("clAmount", roundedTotal, { shouldValidate: true });
        setKeypadString(roundedTotal.toString());
      } else {
        setKeypadString(clAmount.toString());
      }
      setIsFirstType(true);
    } else if (paymentMethod === "mixed") {
      setActiveInput("cash");
      setValue("cash", roundedTotal, { shouldValidate: true });
      setValue("visaAmount", 0, { shouldValidate: true });
      setValue("clAmount", 0, { shouldValidate: true });
      setValue("tips", 0, { shouldValidate: true });
      setKeypadString(roundedTotal.toString());
      setIsFirstType(true);
    }
  }, [paymentMethod, roundedTotal, setValue, isFoodTest]);

  // Watch visaAmount when in visa mode to auto-move excess to tips
  useEffect(() => {
    if (paymentMethod === "visa" && visaAmount > displayedTotal) {
      const excess = visaAmount - displayedTotal;
      setValue("visaAmount", displayedTotal, { shouldValidate: true });
      setValue("tips", excess, { shouldValidate: true });
    }
  }, [visaAmount, paymentMethod, displayedTotal, setValue]);

  // Watch visaAmount and clAmount changes when in mixed mode to subtract from cash
  useEffect(() => {
    if (paymentMethod === "mixed") {
      const calculatedCash = Math.max(0, displayedTotal - visaAmount - clAmount);
      if (cash !== calculatedCash) {
        setValue("cash", calculatedCash, { shouldValidate: true });
      }
    }
  }, [visaAmount, clAmount, paymentMethod, displayedTotal, setValue, cash]);

  // Sync keypad string when active input changes
  const getActiveValue = () => {
    switch (activeInput) {
      case "cash": return cash;
      case "visaAmount": return visaAmount;
      case "clAmount": return clAmount;
      case "tips": return tips;
      default: return 0;
    }
  };

  const handleInputActivate = (newInput: typeof activeInput) => {
    if (paymentMethod === "mixed") {
      // Auto-fill remaining unpaid balance on select
      let otherPaid = 0;
      if (newInput !== "cash") otherPaid += cash;
      if (newInput !== "visaAmount") otherPaid += visaAmount;
      if (newInput !== "clAmount") otherPaid += clAmount;

      const unpaid = Math.max(0, displayedTotal - otherPaid);
      setValue(newInput as any, unpaid, { shouldValidate: true });
      setKeypadString(unpaid === 0 ? "" : unpaid.toString());
    } else {
      const val = getActiveValue();
      setKeypadString(val === 0 ? "" : val.toString());
    }

    setActiveInput(newInput);
    setIsFirstType(true);
  };

  const totalPaid = (paymentMethod === "cash" 
    ? cash
    : paymentMethod === "visa"
      ? visaAmount
      : paymentMethod === "cl"
        ? clAmount
        : paymentMethod === "mixed"
          ? (cash + visaAmount + clAmount)
          : 0);

  // Tips logic
  const changeDue = Math.max(0, cash - Math.max(0, displayedTotal - clAmount - visaAmount));

  // Strict validation for CL customer mapping
  const isClValid = (paymentMethod === "cl")
    ? (isFoodTest || !!customerId)
    : (paymentMethod === "mixed")
      ? (clAmount === 0 || !!customerId)
      : true;

  const isPaid = ((paymentMethod === "cash" 
    ? cash >= displayedTotal 
    : totalPaid >= displayedTotal) && isClValid);

   const onSubmit = (data: PaymentFormData) => {
    if (isComp) {
      onConfirm(data);
      return;
    }

    // Prevent payment if the paid amount is less than the check total or CL customer is missing
    if (!isPaid) {
      if (!isClValid) {
        alert("Cannot close check: CL payment requires a selected customer (or Food Test).");
      } else {
        alert("Cannot close check: Unpaid balance remaining.");
      }
      return;
    }

    const finalData = { ...data };

    if (finalData.paymentMethod === "mixed") {
      const hasCash = (finalData.cash || 0) > 0;
      const hasVisa = (finalData.visaAmount || 0) > 0;
      const hasCL = (finalData.clAmount || 0) > 0;

      const activeMethodsCount = [hasCash, hasVisa, hasCL].filter(Boolean).length;

      if (activeMethodsCount === 1) {
        if (hasCash) {
          finalData.paymentMethod = "cash";
          finalData.visaAmount = 0;
          finalData.clAmount = 0;
          finalData.chkStut = 2; // Cash close
        } else if (hasVisa) {
          finalData.paymentMethod = "visa";
          finalData.cash = 0;
          finalData.clAmount = 0;
          finalData.chkStut = 3; // Visa close
        } else if (hasCL) {
          finalData.paymentMethod = "cl";
          finalData.cash = 0;
          finalData.visaAmount = 0;

          // Determine status chkStut based on the customer kind
          if (finalData.customerName === "Food Test" || isFoodTest) {
            finalData.chkStut = 11; // Food Test
          } else {
            const selectedCustomer = allowedCustomers.find((c: any) => c.id === finalData.customerId);
            if (selectedCustomer) {
              if (selectedCustomer.kind === 1) {
                finalData.chkStut = 4; // Owner CL
              } else if (selectedCustomer.kind === 2) {
                finalData.chkStut = 10; // Staff CL
              } else if (selectedCustomer.kind === 3) {
                finalData.chkStut = 8; // Officer/VIP CL
              } else {
                finalData.chkStut = 4; // default
              }
            } else {
              finalData.chkStut = 4; // default
            }
          }
        }
      }
    }

    onConfirm(finalData);
  };

  // Keyboard keypad press handler
  const handleKeypadPress = (key: string) => {
    let newStr = keypadString;
    
    if (isFirstType) {
      setIsFirstType(false);
      if (key === "back") {
        newStr = "";
      } else if (key === ".") {
        newStr = "0.";
      } else {
        newStr = key;
      }
    } else {
      if (key === "back") {
        newStr = newStr.slice(0, -1);
      } else if (key === ".") {
        if (!newStr.includes(".")) {
          newStr = newStr === "" ? "0." : newStr + ".";
        }
      } else {
        const dotIndex = newStr.indexOf(".");
        if (dotIndex !== -1 && newStr.length - dotIndex > 2) {
          return; // limit to 2 decimal places
        }
        newStr = newStr === "" && key === "0" ? "" : newStr + key;
      }
    }
    
    setKeypadString(newStr);
    const parsedVal = parseFloat(newStr) || 0;
    setValue(activeInput as any, parsedVal, { shouldValidate: true });
  };

  // Quick cash helpers
  const handleExactCash = () => {
    const cashNeeded = Math.max(0, displayedTotal - visaAmount - clAmount);
    setValue("cash", cashNeeded, { shouldValidate: true });
    setKeypadString(cashNeeded.toFixed(2));
    setIsFirstType(true);
  };

  const handleAddCash = (amount: number) => {
    const currentVal = parseFloat(keypadString) || 0;
    const newVal = currentVal + amount;
    setValue("cash", newVal, { shouldValidate: true });
    setKeypadString(newVal.toString());
    setIsFirstType(true);
  };

  const handleSelectCustomer = (customer: any) => {
    setValue("customerId", customer.id, { shouldValidate: true });
    setValue("customerName", customer.name, { shouldValidate: true });

    const isOwner = customer.kind === 1;
    const isOfficer = customer.kind === 3;

    if (paymentMethod === "cl") {
      if (isOfficer) {
        setValue("clAmount", parseFloat(netPriceOnly.toFixed(2)), { shouldValidate: true });
        setValue("chkStut", 8, { shouldValidate: true });
        setValue("tax", 0, { shouldValidate: true });
        setValue("service", 0, { shouldValidate: true });
        setValue("discountAmount", 0, { shouldValidate: true });
        setValue("discountPrsn", 0, { shouldValidate: true });
        setKeypadString(netPriceOnly.toFixed(2));
      } else {
        const targetStut = isOwner ? 4 : 10;
        setValue("chkStut", targetStut, { shouldValidate: true });

        const discountPercent = Number(customer.discount) || 0;
        if (discountPercent > 0) {
          const discountVal = netPriceOnly * (discountPercent / 100);
          const adjustedTotal = checkTotal - discountVal;
          setValue("clAmount", parseFloat(adjustedTotal.toFixed(2)), { shouldValidate: true });
          setValue("discountAmount", parseFloat(discountVal.toFixed(2)), { shouldValidate: true });
          setValue("discountPrsn", discountPercent, { shouldValidate: true });
          setKeypadString(adjustedTotal.toFixed(2));
        } else {
          setValue("clAmount", roundedTotal, { shouldValidate: true });
          setValue("discountAmount", 0, { shouldValidate: true });
          setValue("discountPrsn", 0, { shouldValidate: true });
          setKeypadString(roundedTotal.toString());
        }
        setValue("tax", tax, { shouldValidate: true });
        setValue("service", undefined, { shouldValidate: true });
      }
    } else if (paymentMethod === "mixed") {
      // Mixed mode: selecting customer sets target status, applies discount, but keeps clAmount at 0 until user types it
      if (isOfficer) {
        setValue("chkStut", 8, { shouldValidate: true });
        setValue("tax", 0, { shouldValidate: true });
        setValue("service", 0, { shouldValidate: true });
        setValue("discountAmount", 0, { shouldValidate: true });
        setValue("discountPrsn", 0, { shouldValidate: true });
      } else {
        const targetStut = isOwner ? 4 : 10;
        setValue("chkStut", targetStut, { shouldValidate: true });

        const discountPercent = Number(customer.discount) || 0;
        if (discountPercent > 0) {
          const discountVal = netPriceOnly * (discountPercent / 100);
          setValue("discountAmount", parseFloat(discountVal.toFixed(2)), { shouldValidate: true });
          setValue("discountPrsn", discountPercent, { shouldValidate: true });
        } else {
          setValue("discountAmount", 0, { shouldValidate: true });
          setValue("discountPrsn", 0, { shouldValidate: true });
        }
        setValue("tax", tax, { shouldValidate: true });
        setValue("service", undefined, { shouldValidate: true });
      }
      
      setValue("clAmount", 0, { shouldValidate: true });
      setActiveInput("clAmount");
      setKeypadString("");
      setIsFirstType(true);
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
    setKeypadString(roundedTotal.toString());
  };

  const handleMethodChange = (newMethod: string) => {
    setValue("paymentMethod", newMethod as any, { shouldValidate: true });
    if (newMethod !== "cl") {
      handleClearCustomer();
      setIsFoodTest(false);
    }
  };

  // Comp check Click handler (checks permissions first)
  const handleCompClick = async () => {
    const isPrinted = (printCount || 0) > 0;
    const requiredPermission = isPrinted ? 'check.printed:comp' : 'check:comp';
    
    if (hasPermission(requiredPermission)) {
      setCompConfirmOpen(true);
    } else {
      setSupervisorError(null);
      setClUnlockActive(false);
      setSupervisorOpen(true);
    }
  };

  const handleCompDialogConfirm = async () => {
    setSupervisorLoading(true);
    try {
      const values = {
        paymentMethod: "cash",
        cash: 0,
        visaAmount: 0,
        clAmount: 0,
        paidCash: 0,
        tips: 0,
        isComp: true,
        chkStut: 7,
        discountAmount: formDiscountAmount || 0,
        discountPrsn: formDiscountPrsn || 0,
        customerId: control._defaultValues.customerId || null,
        customerName: control._defaultValues.customerName || null,
      };
      await onConfirm(values as any);
    } catch (err: any) {
      alert(err.message || "Failed to complimentary check");
    } finally {
      setSupervisorLoading(false);
      setCompConfirmOpen(false);
    }
  };

  // Supervisor override confirmation handler (handles Comp or CL unlock)
  const handleCompConfirm = async (pin: string, svId: string) => {
    setSupervisorLoading(true);
    setSupervisorError(null);
    try {
      if (clUnlockActive) {
        const response = await api.post("/auth/login", { userId: svId, pin });
        const user = response.data.data.user;
        const hasOfficerPerm = user.permissions?.includes("check.officer:close");
        if (!hasOfficerPerm) {
          setSupervisorError("Supervisor does not have check.officer:close permission");
          return;
        }
        setClAuthorized(true);
        setValue("supervisorPin", pin, { shouldValidate: true });
        setValue("supervisorId", svId, { shouldValidate: true });
        setSupervisorOpen(false);
      } else {
        const values = {
          paymentMethod: "cash",
          cash: 0,
          visaAmount: 0,
          clAmount: 0,
          paidCash: 0,
          tips: 0,
          isComp: true,
          chkStut: 7,
          discountAmount: formDiscountAmount || 0,
          discountPrsn: formDiscountPrsn || 0,
          customerId: control._defaultValues.customerId || null,
          customerName: control._defaultValues.customerName || null,
          supervisorPin: pin,
          supervisorId: svId,
        };
        
        await onConfirm(values as any);
        setSupervisorOpen(false);
      }
    } catch (err: any) {
      setSupervisorError(err.response?.data?.error || err.message || "Authorization failed");
    } finally {
      setSupervisorLoading(false);
      setClUnlockActive(false);
    }
  };

  const allowedCustomers = (custsData || []).filter(
    (c: any) => c.kind === 1 || c.kind === 2 || c.kind === 3
  );

  const searchedCustomers = allowedCustomers.filter((c: any) => {
    return c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const renderedItems: Array<{
    name: string;
    quantity: number;
    price: number;
    isCompItem?: boolean;
    note?: string;
    unitPrice: number;
  }> = [];

  items.forEach(item => {
    const totalQty = item.quantity;
    const compQty = item.entQty || 0;
    const regularQty = totalQty - compQty;

    if (regularQty > 0) {
      renderedItems.push({
        name: item.name,
        quantity: regularQty,
        price: regularQty * item.unitPrice,
        note: item.note,
        unitPrice: item.unitPrice
      });
    }

    if (compQty > 0) {
      renderedItems.push({
        name: item.name,
        quantity: compQty,
        price: 0,
        isCompItem: true,
        note: item.note,
        unitPrice: item.unitPrice
      });
    }
  });

  if (!shouldRender) return null;

  return (
    <>
      <div 
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-500 ease-in-out ${isOpen ? "opacity-100" : "opacity-0"}`} 
        onClick={onClose} 
      />

      <div 
        ref={drawerRef}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[960px] bg-gray-100 dark:bg-gray-900 shadow-2xl transition-transform duration-500 ease-out select-none ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Left Panel - Order Details */}
        <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700 min-w-0 bg-gray-50 dark:bg-gray-900">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
            <h2 className="text-xl font-bold dark:text-white">Order Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Dine-in table {tableNumber}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {renderedItems.length > 0 ? renderedItems.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-900 dark:text-white">{item.name}</h4>
                    {item.isCompItem && (
                      <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 text-[10px] font-black rounded-lg uppercase tracking-wider">
                        Comp
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Qty: {item.quantity} {item.isCompItem ? "" : `x ${item.unitPrice.toFixed(2)}`}
                  </p>
                  {item.note && <p className="text-xs text-brand-500 mt-1">Note: {item.note}</p>}
                </div>
                <span className="font-mono font-bold text-gray-900 dark:text-white">{item.price.toFixed(2)}</span>
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
              {formChkStut !== 8 && formChkStut !== 11 && !isFoodTest && serviceCharge !== undefined && serviceCharge > 0 && (
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Service Charge</span>
                  <span className="font-mono">{serviceCharge.toFixed(2)}</span>
                </div>
              )}
              {formChkStut !== 8 && formChkStut !== 11 && !isFoodTest && tax !== undefined && tax > 0 && (
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Tax</span>
                  <span className="font-mono">{tax.toFixed(2)}</span>
                </div>
              )}
              {formChkStut !== 11 && !isFoodTest && deliveryCharge !== undefined && deliveryCharge > 0 && (
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Delivery Charge</span>
                  <span className="font-mono">{deliveryCharge.toFixed(2)}</span>
                </div>
              )}
              {formChkStut !== 11 && !isFoodTest && formDiscountAmount > 0 && (
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

        {/* Right Panel - Payment (Touch-First Compact Numerical Keypad layout) */}
        <div className="w-full md:w-[460px] flex flex-col bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0 bg-white dark:bg-gray-800">
            <div>
              <h2 className="text-xl font-bold dark:text-white">Payment</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Select payment method below</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={handleCompClick}
                disabled={supervisorLoading}
                className="px-3.5 py-1.5 border-2 border-orange-500 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              >
                Comp Check
              </button>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                <X size={20} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0 bg-gray-50/50 dark:bg-gray-900/10">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              
              {/* Method Selector */}
              <div className="grid grid-cols-4 gap-2">
                {METHODS.map(method => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => handleMethodChange(method.id)}
                      className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl border transition-all ${paymentMethod === method.id ? "bg-brand-500 text-white border-brand-500 shadow-md" : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                    >
                      <Icon size={18} strokeWidth={2.5} className="mb-0.5" />
                      <span className="text-xs font-bold">{method.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Inputs Cards - Touch-First Clickable Rows */}
              <div className="space-y-2">
                
                {/* Cash Paid input card */}
                {(paymentMethod === "cash" || paymentMethod === "mixed") && (
                  <div 
                    onClick={() => handleInputActivate("cash")}
                    className={`flex items-center justify-between py-2.5 px-3.5 rounded-2xl border-2 transition-all cursor-pointer ${activeInput === "cash" ? "border-brand-500 bg-brand-50/10 shadow-sm animate-pulse-subtle" : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}
                  >
                    <div>
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 block">Cash Paid</span>
                      {paymentMethod === "cash" && changeDue > 0 && (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Change: {changeDue.toFixed(2)} EGP</span>
                      )}
                    </div>
                    <span className="font-mono text-lg font-bold dark:text-white">
                      {cash.toFixed(2)} <span className="text-xs text-gray-400 font-normal">EGP</span>
                    </span>
                  </div>
                )}

                {/* Visa Paid input card */}
                {(paymentMethod === "visa" || paymentMethod === "mixed") && (
                  <div 
                    onClick={() => handleInputActivate("visaAmount")}
                    className={`flex items-center justify-between py-2.5 px-3.5 rounded-2xl border-2 transition-all cursor-pointer ${activeInput === "visaAmount" ? "border-brand-500 bg-brand-50/10 shadow-sm animate-pulse-subtle" : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}
                  >
                    <div>
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 block">Visa Amount</span>
                    </div>
                    <span className="font-mono text-lg font-bold dark:text-white">
                      {visaAmount.toFixed(2)} <span className="text-xs text-gray-400 font-normal">EGP</span>
                    </span>
                  </div>
                )}

                {/* Customer Ledger input card */}
                {paymentMethod === "cl" && (
                  <div className="py-2.5 px-3.5 rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 space-y-2">
                    {!hasClPermission ? (
                      <div className="flex flex-col items-center justify-center py-4 px-2 text-center bg-red-50/10 dark:bg-red-950/10 rounded-xl border border-red-500/20">
                        <ShieldCheck className="h-10 w-10 text-red-500 mb-2 animate-bounce" />
                        <h4 className="font-bold text-sm text-gray-800 dark:text-white">Permission Required</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[280px]">Closing checks as Customer Ledger (CL) requires supervisor authorization.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setSupervisorError(null);
                            setClUnlockActive(true);
                            setSupervisorOpen(true);
                          }}
                          className="mt-3.5 px-4 py-2 bg-brand-500 text-white font-bold rounded-xl text-xs hover:bg-brand-600 transition shadow active:scale-95"
                        >
                          Unlock CL Payment
                        </button>
                      </div>
                    ) : (
                      <>

                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Customer (CL)</span>
                          <div className="flex gap-1.5">
                            <button 
                              type="button" 
                              onClick={() => setIsCustModalOpen(true)}
                              disabled={isFoodTest}
                              className="px-2.5 py-0.5 bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-950/20 dark:text-brand-400 rounded-lg text-xs font-bold transition-all border border-brand-500/20 disabled:opacity-50"
                            >
                              Find Customer
                            </button>
                            {customerName !== "Cash Customer" && (
                              <button 
                                type="button" 
                                onClick={handleClearCustomer}
                                disabled={isFoodTest}
                                className="px-2.5 py-0.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 rounded-lg text-xs font-bold transition-all border border-red-500/20 disabled:opacity-50"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/60 p-2 rounded-xl">
                          <span className="font-bold text-gray-800 dark:text-gray-200 text-xs">{customerName}</span>
                          <span className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 rounded font-bold text-gray-500 dark:text-gray-300">
                            {formChkStut === 11 ? "Food Test" : formChkStut === 8 ? "Officer" : formDiscountPrsn > 0 ? `${formDiscountPrsn}% Disc` : "No Disc"}
                          </span>
                        </div>
                        <div 
                          className={`flex items-center justify-between p-2 rounded-xl border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800`}
                        >
                          <span className="text-xs font-bold">Credit Amount</span>
                          <span className="font-mono text-lg font-bold">
                            {clAmount.toFixed(2)} <span className="text-xs text-gray-400 font-normal">EGP</span>
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Mixed CL row (Mixed payment only) */}
                {paymentMethod === "mixed" && (
                  <div className="p-2.5 rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 space-y-1.5">
                    {!hasClPermission ? (
                      <div className="flex items-center justify-between py-1 bg-red-50/10 dark:bg-red-950/10 rounded-xl border border-red-500/20 px-2.5">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Ledger (CL): Permission Required</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSupervisorError(null);
                            setClUnlockActive(true);
                            setSupervisorOpen(true);
                          }}
                          className="px-2.5 py-1 bg-brand-500 text-white font-bold rounded-lg text-xs hover:bg-brand-600 transition shadow active:scale-95"
                        >
                          Unlock
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Ledger (CL) Credit</span>
                          <div className="flex gap-1">
                            <button type="button" onClick={() => setIsCustModalOpen(true)} className="px-2 py-0.5 bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900 text-brand-600 dark:text-brand-400 rounded text-xs font-bold">Search</button>
                            {customerName !== "Cash Customer" && (
                              <button type="button" onClick={handleClearCustomer} className="px-2 py-0.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded text-xs font-bold">Reset</button>
                            )}
                          </div>
                        </div>
                        {customerName !== "Cash Customer" && (
                          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/60 p-1.5 rounded-lg text-xs font-bold mb-1">
                            <span className="text-gray-850 dark:text-gray-200">{customerName}</span>
                          </div>
                        )}
                        <div 
                          onClick={() => handleInputActivate("clAmount")}
                          className={`flex items-center justify-between p-2 rounded-xl border-2 transition-all cursor-pointer ${customerName === "Cash Customer" ? "bg-gray-50 dark:bg-gray-900/40 text-gray-400 dark:text-gray-500 cursor-not-allowed border-gray-200 dark:border-gray-800" : activeInput === "clAmount" ? "border-brand-500 bg-brand-50/10 shadow-sm" : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750"}`}
                        >
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">CL Credit</span>
                          <span className="font-mono font-bold dark:text-white">{clAmount.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Tips input card (Cash or Visa tips conditionally based on active paymentMethod) */}
                {paymentMethod !== "cl" && (
                  <div 
                    onClick={() => handleInputActivate("tips")}
                    className={`flex items-center justify-between py-2.5 px-3.5 rounded-2xl border-2 transition-all cursor-pointer ${activeInput === "tips" ? "border-brand-500 bg-brand-50/10 shadow-sm animate-pulse-subtle" : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                        {paymentMethod === "visa" ? "Visa Tip" : "Cash Tip"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-bold dark:text-white">{tips.toFixed(2)}</span>
                      {paymentMethod === "cash" && changeDue > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setValue("tips", tips + changeDue, { shouldValidate: true });
                            setValue("cash", cash - changeDue, { shouldValidate: true });
                            setKeypadString((cash - changeDue).toString());
                          }}
                          className="px-2 py-0.5 text-xs bg-brand-500 text-white font-bold rounded-lg hover:bg-brand-600 transition shadow"
                        >
                          As Tip
                        </button>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Integrated numerical keypad (Touch-friendly but Compact size) */}
              {paymentMethod !== "cl" ? (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3.5 shadow-sm flex flex-col gap-2.5 select-none">
                  
                   {/* Quick Cash row (Cash method or Mixed cash input active) */}
                  {activeInput === "cash" && (
                    <div className="grid grid-cols-5 gap-1.5">
                      <button type="button" onClick={handleExactCash} className="h-9 text-xs font-bold bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/60 rounded-xl transition border border-brand-200 dark:border-brand-900">Exact</button>
                      <button type="button" onClick={() => handleAddCash(10)} className="h-9 text-xs font-mono font-bold bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white rounded-xl transition">+10</button>
                      <button type="button" onClick={() => handleAddCash(50)} className="h-9 text-xs font-mono font-bold bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white rounded-xl transition">+50</button>
                      <button type="button" onClick={() => handleAddCash(100)} className="h-9 text-xs font-mono font-bold bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white rounded-xl transition">+100</button>
                      <button type="button" onClick={() => handleAddCash(200)} className="h-9 text-xs font-mono font-bold bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white rounded-xl transition">+200</button>
                    </div>
                  )}

                  {/* Quick Visa row (Visa method or Mixed visa input active) */}
                  {activeInput === "visaAmount" && (
                    <div className="grid grid-cols-1">
                      <button 
                        type="button" 
                        onClick={() => {
                          setValue("visaAmount", displayedTotal, { shouldValidate: true });
                          setKeypadString(displayedTotal.toFixed(2));
                          setIsFirstType(true);
                        }} 
                        className="h-9 text-xs font-bold bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/60 rounded-xl transition border border-brand-200 dark:border-brand-900"
                      >
                        Exact Amount ({displayedTotal.toFixed(2)} EGP)
                      </button>
                    </div>
                  )}

                  {/* Keypad string display */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl py-1.5 px-3 text-right flex items-center justify-between border border-gray-100 dark:border-gray-800">
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                      Typing:
                    </span>
                    <span className="text-lg font-bold font-mono text-gray-800 dark:text-white">
                      {keypadString || "0"}
                    </span>
                  </div>

                  {/* Number Grid */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"].map(key => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleKeypadPress(key)}
                        className={`h-11 rounded-xl flex items-center justify-center text-lg font-bold transition-all active:scale-95 ${key === "back" ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/10" : "bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/80 dark:hover:bg-gray-700 dark:text-white border border-gray-100 dark:border-gray-700"}`}
                      >
                        {key === "back" ? <Delete size={18} /> : key}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                hasClPermission && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const newFoodTestState = !isFoodTest;
                        setIsFoodTest(newFoodTestState);
                        if (newFoodTestState) {
                          setValue("customerName", "Food Test", { shouldValidate: true });
                          setValue("customerId", undefined, { shouldValidate: true });
                          setValue("chkStut", 11, { shouldValidate: true });
                          setValue("tax", 0, { shouldValidate: true });
                          setValue("service", 0, { shouldValidate: true });
                          setValue("discountAmount", 0, { shouldValidate: true });
                          setValue("discountPrsn", 0, { shouldValidate: true });
                          setValue("clAmount", parseFloat(netPriceOnly.toFixed(2)), { shouldValidate: true });
                          setKeypadString(netPriceOnly.toFixed(2));
                        } else {
                          handleClearCustomer();
                        }
                      }}
                      className={`w-full h-16 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all duration-75 active:scale-95 text-base border-2 shadow-sm ${
                        isFoodTest
                          ? "bg-cyan-500 text-white border-cyan-600 dark:bg-cyan-600 dark:border-cyan-700 shadow-cyan-500/10"
                          : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      }`}
                    >
                      <span className={`h-3 w-3 rounded-full ${isFoodTest ? "bg-white animate-pulse" : "bg-gray-300 dark:bg-gray-600"}`} />
                      Food Test Check
                    </button>
                  </div>
                )
              )}

            </div>

            {/* Totals Summary Footer */}
            <div className="shrink-0 p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <div className="space-y-1.5 mb-2.5 md:hidden">
                <div className="flex justify-between text-gray-500 dark:text-gray-400 text-sm">
                  <span>Check Total</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">{displayedTotal.toFixed(2)} EGP</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 text-sm"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={!isPaid}
                  className={`flex-1 py-2.5 px-4 font-bold rounded-xl shadow-lg transition-all active:scale-95 text-sm ${isPaid ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20" : "bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600"}`}
                >
                  CONFIRM & CLOSE
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Customer search modal */}
      {isCustModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-gray-100 dark:border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Customer Search</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Search customer ledger mappings</p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsCustModalOpen(false)}
                className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 pb-3 bg-gray-50/50 dark:bg-gray-900/50">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or ID..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                />
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
                      key={cust.id}
                      type="button"
                      onClick={() => handleSelectCustomer(cust)}
                      className="w-full text-left p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-gray-100 dark:border-gray-800 hover:border-brand-500/30 rounded-2xl transition-all shadow-sm flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400">
                            #{cust.id.slice(0, 6)}
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
                        <div className="text-right">
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

      {/* Supervisor override verification for Comp Check / CL unlock */}
      <SupervisorOverrideDialog
        open={supervisorOpen}
        onClose={() => {
          setSupervisorOpen(false);
          setClUnlockActive(false);
        }}
        onSubmit={handleCompConfirm}
        isLoading={supervisorLoading}
        error={supervisorError}
        permissionRequired={clUnlockActive ? "check.officer:close" : "check:comp"}
      />

      {/* shadcn confirmation dialog for Comp Check */}
      <ConfirmationDialog
        isOpen={compConfirmOpen}
        onClose={() => setCompConfirmOpen(false)}
        onConfirm={handleCompDialogConfirm}
        title="Apply Complimentary Check"
        description="Are you sure you want to mark this check as Complimentary (Comp)? This action cannot be undone."
        confirmText="Confirm Comp"
        cancelText="Cancel"
      />
    </>
  );
}
