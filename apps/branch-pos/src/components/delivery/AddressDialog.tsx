import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, CheckCircle, Circle } from "lucide-react";

const AddressFormSchema = z.object({
  deliveryZoneId: z.string().min(1, "Delivery zone is required"),
  address: z.string().min(1, "Address details are required"),
  floor: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  landmark: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isDefault: z.boolean().default(false)
});

type AddressFormValues = z.infer<typeof AddressFormSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAddress: AddressFormValues | null;
  zones: { id: string; name: string; deliveryCharge: number }[];
  onSave: (data: AddressFormValues) => Promise<void>;
}

export function AddressDialog({ open, onOpenChange, editingAddress, zones, onSave }: Props) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(AddressFormSchema),
    defaultValues: {
      deliveryZoneId: "",
      address: "",
      floor: "",
      unit: "",
      landmark: "",
      notes: "",
      isDefault: false
    }
  });

  const isDefaultWatched = watch("isDefault");

  useEffect(() => {
    if (open) {
      if (editingAddress) {
        reset({
          deliveryZoneId: editingAddress.deliveryZoneId,
          address: editingAddress.address,
          floor: editingAddress.floor || "",
          unit: editingAddress.unit || "",
          landmark: editingAddress.landmark || "",
          notes: editingAddress.notes || "",
          isDefault: !!editingAddress.isDefault
        });
      } else {
        reset({
          deliveryZoneId: "",
          address: "",
          floor: "",
          unit: "",
          landmark: "",
          notes: "",
          isDefault: false
        });
      }
    }
  }, [open, editingAddress, reset]);

  const onSubmit = async (values: any) => {
    await onSave(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-w-[calc(100%-2rem)] w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-slate-900 dark:text-slate-100 select-none shadow-2xl overflow-y-auto max-h-[95vh]">
        <DialogHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-lg font-bold tracking-tight text-slate-850 dark:text-slate-100 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-500" />
            {editingAddress ? "Edit Dispatch Address" : "Add Dispatch Address"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Zone Selector */}
            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                Delivery Zone *
              </label>
              <select
                {...register("deliveryZoneId")}
                className="w-full h-16 rounded-2xl bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 px-4 text-base font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Zone...</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name} ({zone.deliveryCharge} EGP)
                  </option>
                ))}
              </select>
              {errors.deliveryZoneId && (
                <p className="text-xs text-red-500 font-bold mt-1">{errors.deliveryZoneId.message as string}</p>
              )}
            </div>

            {/* Address Details */}
            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                Address Details *
              </label>
              <Input
                {...register("address")}
                className="rounded-2xl h-16 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-base font-semibold focus:ring-2 focus:ring-indigo-500 w-full"
                placeholder="Street name, Building number..."
              />
              {errors.address && (
                <p className="text-xs text-red-500 font-bold mt-1">{errors.address.message as string}</p>
              )}
            </div>

            {/* Floor */}
            <div className="space-y-2 text-left">
              <label className="text-xs font-bold block uppercase tracking-wider">
                Floor
              </label>
              <Input
                {...register("floor")}
                className="rounded-2xl h-16 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-base font-semibold focus:ring-2 focus:ring-indigo-500 w-full"
                placeholder="E.g. 3rd floor"
              />
            </div>

            {/* Unit / Flat */}
            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                Unit / Flat
              </label>
              <Input
                {...register("unit")}
                className="rounded-2xl h-16 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-base font-semibold focus:ring-2 focus:ring-indigo-500 w-full"
                placeholder="E.g. Flat 12"
              />
            </div>

            {/* Landmark */}
            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                Landmark
              </label>
              <Input
                {...register("landmark")}
                className="rounded-2xl h-16 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-base font-semibold focus:ring-2 focus:ring-indigo-500 w-full"
                placeholder="E.g. Behind Metro Market"
              />
            </div>

            {/* Dispatch Notes */}
            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                Dispatch / Rider Notes
              </label>
              <Input
                {...register("notes")}
                className="rounded-2xl h-16 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-base font-semibold focus:ring-2 focus:ring-indigo-500 w-full"
                placeholder="E.g. Ring bell twice, leave with guard"
              />
            </div>
          </div>

          {/* Primary Address Button */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl mt-4">
            <div className="text-left">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Set as Primary Address</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Use as default address when creating new orders</p>
            </div>
            <button
              type="button"
              onClick={() => setValue("isDefault", !isDefaultWatched)}
              className={`flex items-center gap-2 h-14 px-5 rounded-xl text-sm font-extrabold transition-all border cursor-pointer ${
                isDefaultWatched
                  ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
                  : "text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300"
              }`}
            >
              {isDefaultWatched ? (
                <CheckCircle className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              ) : (
                <Circle className="w-5 h-5" />
              )}
              {isDefaultWatched ? "Primary" : "Secondary"}
            </button>
          </div>

          <DialogFooter className="pt-4 bg-transparent border-t border-slate-100 dark:border-slate-800 flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-16 rounded-2xl text-sm font-bold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer active:scale-95 transition-all duration-75"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm cursor-pointer active:scale-95 transition-all duration-75 border-none"
            >
              {isSubmitting ? "Saving..." : "Save Address"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
