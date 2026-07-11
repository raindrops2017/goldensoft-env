import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useNavigate, useLocation } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreateDeliveryCustomerInputSchema,
  type DeliveryCustomer,
} from "@goldensoft/core-schemas";
import { useChecksApi, useDeliveryZones } from "@/hooks/api/useChecksApi";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  User,
  Phone,
  MapPin,
  Trash2,
  Plus,
  CheckCircle,
  Circle,
  ArrowLeft,
  Save,
  X,
} from "lucide-react";
import { CustomerFormAddressCard } from "../../../components/delivery/CustomerFormAddressCard";

export default function NewCustomerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const checksApi = useChecksApi();
  const { data: zones = [] } = useDeliveryZones();
  const [saving, setSaving] = useState(false);

  const stateCustomer = location.state?.customer as
    | DeliveryCustomer
    | undefined;
  const stateQuery = location.state?.query as string | undefined;
  const fromRoute = location.state?.from || "/delivery";
  const isPhoneQuery = stateQuery
    ? /^\+?[0-9\s-]{4,15}$/.test(stateQuery)
    : false;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(CreateDeliveryCustomerInputSchema),
    defaultValues: {
      name: "",
      phones: [{ phone: "", isDefault: true }],
      addresses: [
        {
          deliveryZoneId: "",
          address: "",
          floor: "",
          unit: "",
          landmark: "",
          notes: "",
          isDefault: true,
        },
      ],
    },
  });

  const errs = errors as any;

  const {
    fields: phoneFields,
    append: appendPhone,
    remove: removePhone,
  } = useFieldArray({
    control,
    name: "phones",
  });

  const {
    fields: addressFields,
    append: appendAddress,
    remove: removeAddress,
  } = useFieldArray({
    control,
    name: "addresses",
  });

  const watchedPhones = watch("phones");
  const watchedAddresses = watch("addresses");

  const handleSetDefaultPhone = (index: number) => {
    watchedPhones?.forEach((_: any, idx: number) => {
      setValue(`phones.${idx}.isDefault`, idx === index);
    });
  };

  const handleSetDefaultAddress = (index: number) => {
    watchedAddresses?.forEach((_: any, idx: number) => {
      setValue(`addresses.${idx}.isDefault`, idx === index);
    });
  };

  useEffect(() => {
    if (stateCustomer) {
      const initialPhones =
        stateCustomer.phones && stateCustomer.phones.length > 0
          ? stateCustomer.phones.map((p) => ({
              phone: p.phone,
              isDefault: !!p.isDefault,
            }))
          : [{ phone: "", isDefault: true }];

      const initialAddresses =
        stateCustomer.addresses && stateCustomer.addresses.length > 0
          ? stateCustomer.addresses.map((a) => ({
              deliveryZoneId: a.deliveryZoneId || "",
              address: a.address || "",
              floor: a.floor || "",
              unit: a.unit || "",
              landmark: a.landmark || "",
              notes: a.notes || "",
              isDefault: !!a.isDefault,
            }))
          : [
              {
                deliveryZoneId: "",
                address: "",
                floor: "",
                unit: "",
                landmark: "",
                notes: "",
                isDefault: true,
              },
            ];

      reset({
        name: stateCustomer.name || "",
        agentNotes: stateCustomer.agentNotes || "",
        phones: initialPhones,
        addresses: initialAddresses,
      });
    } else if (stateQuery) {
      reset({
        name: isPhoneQuery ? "" : stateQuery,
        agentNotes: "",
        phones: [{ phone: isPhoneQuery ? stateQuery : "", isDefault: true }],
        addresses: [
          {
            deliveryZoneId: "",
            address: "",
            floor: "",
            unit: "",
            landmark: "",
            notes: "",
            isDefault: true,
          },
        ],
      });
    }
  }, [stateCustomer, stateQuery, reset, isPhoneQuery]);

  const onSubmitForm = async (formData: any) => {
    const defaultPhoneExists = formData.phones.some((p: any) => p.isDefault);
    const defaultAddressExists = formData.addresses.some(
      (a: any) => a.isDefault,
    );

    if (!defaultPhoneExists && formData.phones.length > 0) {
      formData.phones[0].isDefault = true;
    }
    if (!defaultAddressExists && formData.addresses.length > 0) {
      formData.addresses[0].isDefault = true;
    }

    setSaving(true);
    try {
      let savedCust: DeliveryCustomer;
      if (stateCustomer?.id) {
        savedCust = await checksApi.updateDeliveryCustomer.mutateAsync({
          id: stateCustomer.id,
          data: formData,
        });
        toast.success("Customer profile updated successfully");
        navigate(fromRoute, { state: { customer: savedCust } });
      } else {
        savedCust =
          await checksApi.createDeliveryCustomer.mutateAsync(formData);
        toast.success("Customer registered successfully!");
        const defaultAddressIdx = savedCust.addresses.findIndex(
          (a) => a.isDefault,
        );
        const finalAddressIndex =
          defaultAddressIdx !== -1 ? defaultAddressIdx : 0;
        navigate("/delivery/order", {
          state: {
            customer: savedCust,
            addressIndex: finalAddressIndex,
          },
        });
      }
    } catch (e: any) {
      toast.error("Save failed: " + (e.response?.data?.error || e.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-[#0a0510] text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-200 select-none">
      {/* ── HEADER ── */}
      <header className="flex justify-between items-center px-6 h-20 bg-white dark:bg-[#120a1c] border-b border-slate-200 dark:border-white/10 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            className="w-14 h-14 p-0 rounded-2xl text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer flex items-center justify-center border border-slate-200 dark:border-white/10"
            onClick={() => navigate(fromRoute)}
          >
            <ArrowLeft className="w-6 h-6 text-slate-700 dark:text-white" />
          </Button>
          <div className="text-left">
            <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
              {stateCustomer?.id
                ? "Edit Customer Details"
                : "New Customer Registration"}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
              CRM Contact profiles and Dispatch Zone setups.
            </p>
          </div>
        </div>

        {/* Global Save Actions in Header */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-14 px-5 rounded-xl border-slate-200 dark:border-white/10 text-slate-755 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1c1829] dark:bg-[#120a1c] text-xs font-black active:scale-95 transition-all cursor-pointer"
            onClick={() => navigate(fromRoute)}
          >
            <X className="w-4 h-4 mr-1.5" />
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={handleSubmit(onSubmitForm)}
            className="h-14 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black active:scale-95 transition-all shadow-md cursor-pointer border-none flex items-center gap-1.5"
          >
            <Save className="w-4 h-4 text-white" />
            {saving
              ? "Saving..."
              : stateCustomer?.id
                ? "Update Profile"
                : "Register & Create Ticket 🛵"}
          </Button>
        </div>
      </header>

      {/* ── TWO-COLUMN SPLIT LAYOUT ── */}
      <main className="flex-1 min-h-0 p-6 flex gap-6 overflow-hidden">
        {/* Left Column: Basic Info & Contact Numbers (Width: 40%) */}
        <section className="w-[40%] flex flex-col gap-5 overflow-y-auto pr-1 scrollbar-thin min-h-0">
          {/* Card 1: Basic Personal Info */}
          <div className="bg-white dark:bg-[#120a1c] border border-slate-200 dark:border-white/10 rounded-3xl p-5 shadow-sm space-y-4 shrink-0 text-left">
            <h3 className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <User className="w-5 h-5" /> Personal Information
            </h3>
            <div className="space-y-2">
              <label className="block text-slate-500 dark:text-slate-400 uppercase tracking-wide text-xs font-black">
                Customer Name *
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-350 w-5 h-5" />
                <Input
                  {...register("name")}
                  className="pl-12 rounded-2xl h-16 bg-slate-50 dark:bg-[#1c1829] border-slate-200 dark:border-white/5 text-slate-900 dark:text-slate-100 text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter customer full name"
                />
              </div>
              {errs.name && (
                <p className="text-xs text-red-500 mt-1 font-bold">
                  {errs.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-slate-500 dark:text-slate-400 uppercase tracking-wide text-xs font-black">
                Sales Agent Notes (Internal Only)
              </label>
              <textarea
                {...register("agentNotes")}
                className="w-full rounded-2xl p-4 h-24 bg-slate-50 dark:bg-[#1c1829] border border-slate-200 dark:border-white/5 text-slate-900 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Internal preferences, loyalty level, agent directives..."
              />
            </div>
          </div>

          {/* Card 2: Contact Numbers registry */}
          <div className="bg-white dark:bg-[#120a1c] border border-slate-200 dark:border-white/10 rounded-3xl p-5 shadow-sm flex flex-col min-h-0 flex-1 overflow-hidden">
            <div className="flex justify-between items-center shrink-0 mb-4 pb-3 border-b border-slate-100 dark:border-white/10">
              <h3 className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                <Phone className="w-5 h-5" /> Phone Numbers
              </h3>
              <Button
                type="button"
                className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black active:scale-95 transition-all flex items-center gap-1 cursor-pointer border-none"
                onClick={() => appendPhone({ phone: "", isDefault: false })}
              >
                <Plus className="w-3.5 h-3.5" /> Add Phone
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
              {phoneFields.map((field, index) => {
                const isDefault = watchedPhones?.[index]?.isDefault;
                return (
                  <div
                    key={field.id}
                    className="flex gap-3 items-center bg-slate-50 dark:bg-[#1c1829] p-4 rounded-2xl border border-slate-200 dark:border-white/5"
                  >
                    <button
                      type="button"
                      onClick={() => handleSetDefaultPhone(index)}
                      className={`flex items-center gap-2 h-14 px-4 rounded-xl text-xs font-black transition-all border cursor-pointer shrink-0 ${
                        isDefault
                          ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30"
                          : "text-slate-600 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:text-slate-350"
                      }`}
                    >
                      {isDefault ? (
                        <CheckCircle className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                      {isDefault ? "Primary" : "Secondary"}
                    </button>

                    <div className="flex-1 text-left">
                      <Input
                        {...register(`phones.${index}.phone` as const)}
                        className="rounded-2xl h-16 bg-white dark:bg-[#252036] border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
                        placeholder="Mobile Number (e.g. 01xxxxxxxxx)"
                      />
                      {errs.phones?.[index]?.phone && (
                        <p className="text-xs text-red-500 mt-1 font-bold">
                          {errs.phones[index].phone.message}
                        </p>
                      )}
                    </div>

                    {phoneFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-12 h-12 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 active:scale-95 cursor-pointer shrink-0 border border-slate-250 dark:border-white/10 p-0 flex items-center justify-center"
                        onClick={() => removePhone(index)}
                      >
                        <Trash2 className="w-5 h-5 text-red-500" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Right Column: Dispatch Locations address book (Width: 60%) */}
        <section className="w-[60%] flex flex-col bg-white dark:bg-[#120a1c] border border-slate-200 dark:border-white/10 rounded-3xl p-5 shadow-sm overflow-hidden min-h-0">
          <div className="flex justify-between items-center shrink-0 mb-4 pb-3 border-b border-slate-100 dark:border-white/10">
            <h3 className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-5 h-5" /> Dispatch Locations / Address Book
            </h3>
            <Button
              type="button"
              className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black active:scale-95 transition-all flex items-center gap-1 cursor-pointer border-none"
              onClick={() =>
                appendAddress({
                  deliveryZoneId: "",
                  address: "",
                  floor: "",
                  unit: "",
                  landmark: "",
                  notes: "",
                  isDefault: false,
                })
              }
            >
              <Plus className="w-3.5 h-3.5" /> Add Address Option
            </Button>
          </div>

          {/* Scrollable list of address cards */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
            {addressFields.map((field, index) => (
              <CustomerFormAddressCard
                key={field.id}
                index={index}
                register={register}
                remove={removeAddress}
                isDefault={!!watchedAddresses?.[index]?.isDefault}
                handleSetDefault={handleSetDefaultAddress}
                zones={
                  zones as {
                    id: string;
                    name: string;
                    deliveryCharge: number;
                  }[]
                }
                errors={errs.addresses?.[index]}
                canDelete={addressFields.length > 1}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
