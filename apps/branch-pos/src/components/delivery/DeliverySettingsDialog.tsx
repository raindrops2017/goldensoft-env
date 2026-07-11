import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeliveryZones, useDeliveryPilots, useChecksApi } from "@/hooks/api/useChecksApi";
import { Settings, Map, Motorbike } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ZoneSettingsTab } from "./ZoneSettingsTab";
import { PilotSettingsTab } from "./PilotSettingsTab";
import type { CreateDeliveryZoneInput, CreateDeliveryPilotInput } from "@goldensoft/core-schemas";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DeliverySettingsDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const checksApi = useChecksApi();

  const [activeTab, setActiveTab] = useState<"zones" | "pilots">("zones");

  // Fetch all zones/pilots (including inactive ones)
  const { data: zones = [], refetch: refetchZones } = useDeliveryZones(true);
  const { data: pilots = [], refetch: refetchPilots } = useDeliveryPilots(true);

  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editingPilotId, setEditingPilotId] = useState<string | null>(null);

  // Callbacks for Zone CRUD
  const onSubmitZone = async (data: CreateDeliveryZoneInput) => {
    try {
      if (editingZoneId) {
        await checksApi.updateDeliveryZone.mutateAsync({
          id: editingZoneId,
          data: { name: data.name, deliveryCharge: data.deliveryCharge }
        });
        toast.success("Zone updated successfully");
      } else {
        await checksApi.createDeliveryZone.mutateAsync({
          name: data.name,
          deliveryCharge: data.deliveryCharge
        });
        toast.success("Zone created successfully");
      }
      refetchZones();
      queryClient.invalidateQueries({ queryKey: ["deliveryZones"] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || "Failed to save zone");
      throw err;
    }
  };

  const onToggleZoneActive = async (zone: any) => {
    try {
      if (zone.isActive) {
        await checksApi.deactivateDeliveryZone.mutateAsync(zone.id);
        toast.success(`Zone ${zone.name} deactivated`);
      } else {
        await checksApi.updateDeliveryZone.mutateAsync({
          id: zone.id,
          data: { name: zone.name, deliveryCharge: zone.deliveryCharge, isActive: true }
        });
        toast.success(`Zone ${zone.name} reactivated`);
      }
      refetchZones();
      queryClient.invalidateQueries({ queryKey: ["deliveryZones"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle zone status");
    }
  };

  // Callbacks for Pilot CRUD
  const onSubmitPilot = async (data: CreateDeliveryPilotInput) => {
    try {
      if (editingPilotId) {
        await checksApi.updateDeliveryPilot.mutateAsync({
          id: editingPilotId,
          data: { name: data.name, phone: data.phone || null }
        });
        toast.success("Pilot updated successfully");
      } else {
        await checksApi.createDeliveryPilot.mutateAsync({
          name: data.name,
          phone: data.phone || null
        });
        toast.success("Pilot created successfully");
      }
      refetchPilots();
      queryClient.invalidateQueries({ queryKey: ["deliveryPilots"] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || "Failed to save pilot");
      throw err;
    }
  };

  const onTogglePilotActive = async (pilot: any) => {
    try {
      if (pilot.isActive) {
        await checksApi.deactivateDeliveryPilot.mutateAsync(pilot.id);
        toast.success(`Pilot ${pilot.name} deactivated`);
      } else {
        await checksApi.updateDeliveryPilot.mutateAsync({
          id: pilot.id,
          data: { name: pilot.name, phone: pilot.phone, isActive: true }
        });
        toast.success(`Pilot ${pilot.name} reactivated`);
      }
      refetchPilots();
      queryClient.invalidateQueries({ queryKey: ["deliveryPilots"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle pilot status");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-6xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-slate-900 dark:text-slate-100 overflow-hidden flex flex-col h-[85vh] shadow-2xl">
        <DialogHeader className="shrink-0 border-b border-slate-100 dark:border-slate-800 pb-4 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-500" />
            <DialogTitle className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">
              Zones & Pilots Configuration
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Tab Selection Row - Oversized touch targets */}
        <div className="flex gap-2.5 p-1.5 bg-slate-100 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800/80 my-4 shrink-0">
          <button
            onClick={() => {
              setActiveTab("zones");
              setEditingZoneId(null);
            }}
            className={`flex-1 h-14 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
              activeTab === "zones"
                ? "bg-indigo-600 text-white shadow-md border-none"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-850"
            }`}
          >
            <Map className="w-5 h-5" />
            Delivery Zones
          </button>
          <button
            onClick={() => {
              setActiveTab("pilots");
              setEditingPilotId(null);
            }}
            className={`flex-1 h-14 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
              activeTab === "pilots"
                ? "bg-indigo-600 text-white shadow-md border-none"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-850"
            }`}
          >
            <Motorbike className="w-5 h-5" />
            Delivery Pilots
          </button>
        </div>

        {/* Scrollable Tab Body */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {activeTab === "zones" ? (
            <ZoneSettingsTab
              zones={zones}
              editingZoneId={editingZoneId}
              setEditingZoneId={setEditingZoneId}
              onSubmitZone={onSubmitZone}
              onToggleZoneActive={onToggleZoneActive}
            />
          ) : (
            <PilotSettingsTab
              pilots={pilots}
              editingPilotId={editingPilotId}
              setEditingPilotId={setEditingPilotId}
              onSubmitPilot={onSubmitPilot}
              onTogglePilotActive={onTogglePilotActive}
            />
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-slate-100 dark:border-slate-800 pt-4 mt-4">
          <Button
            type="button"
            className="h-16 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-sm font-extrabold active:scale-95 transition-all w-full border-none shadow-sm"
            onClick={() => onOpenChange(false)}
          >
            Close Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
