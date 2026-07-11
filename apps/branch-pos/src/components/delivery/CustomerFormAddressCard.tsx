import type { UseFormRegister } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, CheckCircle, Circle, Building, Landmark, FileText } from "lucide-react";

interface Props {
  index: number;
  register: UseFormRegister<any>;
  remove: (index: number) => void;
  isDefault: boolean;
  handleSetDefault: (index: number) => void;
  zones: { id: string; name: string; deliveryCharge: number }[];
  errors: any;
  canDelete: boolean;
}

export function CustomerFormAddressCard({
  index,
  register,
  remove,
  isDefault,
  handleSetDefault,
  zones,
  errors,
  canDelete
}: Props) {
  return (
    <div className="bg-slate-50 dark:bg-[#1c1829] p-5 rounded-2xl border border-slate-200 dark:border-white/5 space-y-4 text-left select-none shadow-sm">
      {/* Default Selector and Delete */}
      <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-white/10">
        <button
          type="button"
          onClick={() => handleSetDefault(index)}
          className={`flex items-center gap-2 h-12 px-4 rounded-xl text-xs font-black transition-all border cursor-pointer ${
            isDefault
              ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30"
              : "text-slate-600 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:text-slate-350"
          }`}
        >
          {isDefault ? <CheckCircle className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> : <Circle className="w-5 h-5" />}
          {isDefault ? "Primary Address" : "Set as Primary Address"}
        </button>

        {canDelete && (
          <Button
            type="button"
            variant="ghost"
            className="w-12 h-12 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 active:scale-95 cursor-pointer flex items-center justify-center p-0 border border-slate-200 dark:border-white/10"
            onClick={() => remove(index)}
          >
            <Trash2 className="w-5 h-5 text-red-500" />
          </Button>
        )}
      </div>

      {/* Main Details and Zone Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-1">
          <label className="block text-slate-500 dark:text-slate-400 text-xs font-black uppercase">
            Address Details *
          </label>
          <Input
            {...register(`addresses.${index}.address` as const)}
            className="rounded-2xl h-16 bg-white dark:bg-[#252036] border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
            placeholder="Street Name, Building Name/Number..."
          />
          {errors?.address && (
            <p className="text-xs text-red-500 mt-1 font-bold">{errors.address.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-slate-500 dark:text-slate-400 text-xs font-black uppercase">
            Delivery Zone *
          </label>
          <select
            {...register(`addresses.${index}.deliveryZoneId` as const)}
            className="flex h-16 w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#252036] text-slate-900 dark:text-slate-100 px-4 py-1 text-sm font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select Zone...</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name} ({z.deliveryCharge.toFixed(0)} EGP)
              </option>
            ))}
          </select>
          {errors?.deliveryZoneId && (
            <p className="text-xs text-red-500 mt-1 font-bold">{errors.deliveryZoneId.message}</p>
          )}
        </div>
      </div>

      {/* Sub details: Floor, Unit, Landmark */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="block text-slate-500 dark:text-slate-400 text-xs font-black uppercase flex items-center gap-1.5">
            <Building className="w-4 h-4 text-slate-450 dark:text-slate-400" /> Floor Level
          </label>
          <Input
            {...register(`addresses.${index}.floor` as const)}
            className="rounded-2xl h-16 bg-white dark:bg-[#252036] border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 text-sm font-semibold"
            placeholder="e.g. 3rd Floor"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-slate-500 dark:text-slate-400 text-xs font-black uppercase flex items-center gap-1.5">
            <Building className="w-4 h-4 text-slate-450 dark:text-slate-400" /> Unit / Apt
          </label>
          <Input
            {...register(`addresses.${index}.unit` as const)}
            className="rounded-2xl h-16 bg-white dark:bg-[#252036] border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 text-sm font-semibold"
            placeholder="e.g. Apartment 14"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-slate-500 dark:text-slate-400 text-xs font-black uppercase flex items-center gap-1.5">
            <Landmark className="w-4 h-4 text-slate-450 dark:text-slate-400" /> Nearby Landmark
          </label>
          <Input
            {...register(`addresses.${index}.landmark` as const)}
            className="rounded-2xl h-16 bg-white dark:bg-[#252036] border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 text-sm font-semibold"
            placeholder="e.g. Near Metro Market"
          />
        </div>
      </div>

      {/* Driver notes */}
      <div className="space-y-1">
        <label className="block text-slate-500 dark:text-slate-400 text-xs font-black uppercase flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-slate-450 dark:text-slate-400" /> Rider Notes / Dispatch Instructions
        </label>
        <textarea
          {...register(`addresses.${index}.notes` as const)}
          rows={2}
          className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#252036] text-slate-900 dark:text-slate-100 px-4 py-3 text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
          placeholder="E.g. Ring bell twice, call before dispatch..."
        />
      </div>
    </div>
  );
}
