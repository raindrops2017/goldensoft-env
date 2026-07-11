import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, CheckCircle, Circle } from "lucide-react";

const PhoneFormSchema = z.object({
  phone: z.string().min(11, "Phone number must be at least 11 digits"),
  isDefault: z.boolean().default(false)
});

type PhoneFormValues = z.infer<typeof PhoneFormSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPhone: { phone: string; isDefault: boolean } | null;
  onSave: (data: PhoneFormValues) => Promise<void>;
}

export function PhoneDialog({ open, onOpenChange, editingPhone, onSave }: Props) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(PhoneFormSchema),
    defaultValues: {
      phone: "",
      isDefault: false
    }
  });

  const isDefaultWatched = watch("isDefault");

  useEffect(() => {
    if (open) {
      if (editingPhone) {
        reset({
          phone: editingPhone.phone,
          isDefault: !!editingPhone.isDefault
        });
      } else {
        reset({
          phone: "",
          isDefault: false
        });
      }
    }
  }, [open, editingPhone, reset]);

  const onSubmit = async (values: any) => {
    await onSave(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-w-[calc(100%-2rem)] w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-slate-900 dark:text-slate-100 select-none shadow-2xl">
        <DialogHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-lg font-bold tracking-tight text-slate-850 dark:text-slate-100 flex items-center gap-2">
            <Phone className="w-5 h-5 text-indigo-500" />
            {editingPhone ? "Edit Contact Phone" : "Add Contact Phone"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
          <div className="space-y-2 text-left">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-300 w-5 h-5" />
              <Input
                {...register("phone")}
                className="pl-12 rounded-2xl h-16 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-base font-semibold focus:ring-2 focus:ring-indigo-500 w-full"
                placeholder="Mobile Number (e.g. 01xxxxxxxxx)"
              />
            </div>
            {errors.phone && (
              <p className="text-xs text-red-500 font-bold mt-1">{errors.phone.message as string}</p>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <div className="text-left">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Set as Primary</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Use this number as default for delivery tickets</p>
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
              {isSubmitting ? "Saving..." : "Save Number"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
