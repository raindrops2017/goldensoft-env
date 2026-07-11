import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateDeliveryPilotInputSchema, type CreateDeliveryPilotInput } from "@goldensoft/core-schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Check, Pencil, Power } from "lucide-react";

interface Props {
  pilots: any[];
  editingPilotId: string | null;
  setEditingPilotId: (id: string | null) => void;
  onSubmitPilot: (data: CreateDeliveryPilotInput) => Promise<void>;
  onTogglePilotActive: (pilot: any) => Promise<void>;
}

export function PilotSettingsTab({
  pilots,
  editingPilotId,
  setEditingPilotId,
  onSubmitPilot,
  onTogglePilotActive
}: Props) {
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<CreateDeliveryPilotInput>({
    resolver: zodResolver(CreateDeliveryPilotInputSchema),
    defaultValues: {
      name: "",
      phone: ""
    }
  });

  useEffect(() => {
    if (editingPilotId) {
      const pilot = pilots.find(p => p.id === editingPilotId);
      if (pilot) {
        setValue("name", pilot.name);
        setValue("phone", pilot.phone || "");
      }
    } else {
      reset({
        name: "",
        phone: ""
      });
    }
  }, [editingPilotId, pilots, setValue, reset]);

  const handleFormSubmit = async (data: CreateDeliveryPilotInput) => {
    try {
      await onSubmitPilot(data);
      reset({ name: "", phone: "" });
      setEditingPilotId(null);
    } catch (err) {
      // error handled by parent
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Dynamic Pilot Form - Oversized Touch Targets */}
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row gap-4 items-end"
      >
        <div className="flex-1 space-y-2 text-left w-full">
          <label className="text-xs font-black uppercase text-slate-500">Pilot Name *</label>
          <Input
            type="text"
            {...register("name")}
            placeholder="E.g. Ahmed Ali"
            className="h-16 rounded-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm font-semibold"
          />
          {errors.name && (
            <p className="text-xs text-red-500 font-bold mt-1">{errors.name.message}</p>
          )}
        </div>
        <div className="w-full md:w-56 space-y-2 text-left">
          <label className="text-xs font-black uppercase text-slate-500">Phone Number (Optional)</label>
          <Input
            type="text"
            {...register("phone")}
            placeholder="E.g. 01223456789"
            className="h-16 rounded-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm font-semibold"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto shrink-0">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-16 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-extrabold active:scale-95 transition-all flex-1 md:flex-none border-none shadow-sm"
          >
            {editingPilotId ? <Check className="w-5 h-5 mr-1.5" /> : <Plus className="w-5 h-5 mr-1.5" />}
            {editingPilotId ? "Update" : "Add Pilot"}
          </Button>
          {editingPilotId && (
            <Button
              type="button"
              variant="outline"
              className="h-16 px-5 rounded-2xl text-sm font-bold active:scale-95 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
              onClick={() => {
                setEditingPilotId(null);
                reset({ name: "", phone: "" });
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>

      {/* Pilots Table - Large font sizes */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider text-[10px] h-14">
              <th className="px-5">Pilot Name</th>
              <th className="px-5">Phone</th>
              <th className="px-5 text-center">Status</th>
              <th className="px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pilots.map((pilot: any) => (
              <tr key={pilot.id} className="hover:bg-slate-55 dark:hover:bg-slate-950/10 h-16 text-sm">
                <td className="px-5 font-extrabold text-slate-800 dark:text-slate-200">{pilot.name}</td>
                <td className="px-5 font-bold text-slate-500 dark:text-slate-400">{pilot.phone || "N/A"}</td>
                <td className="px-5 text-center">
                  <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    pilot.isActive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-850 dark:text-slate-450"
                  }`}>
                    {pilot.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-5 text-right">
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-12 w-12 p-0 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 cursor-pointer border border-slate-200 dark:border-slate-800"
                      onClick={() => setEditingPilotId(pilot.id)}
                    >
                      <Pencil className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`h-12 w-12 p-0 rounded-xl active:scale-95 border border-slate-200 dark:border-slate-800 cursor-pointer ${
                        pilot.isActive 
                          ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" 
                          : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                      }`}
                      onClick={() => onTogglePilotActive(pilot)}
                    >
                      <Power className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
