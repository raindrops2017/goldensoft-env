
import { getChkByTableNo } from "@/services/checksApi";
import { useQuery } from "@tanstack/react-query";


export const useTablesOrder = (
    branchId: number|null, tableNo: string|undefined, currentDate: string
  ) => {
    return useQuery({
      queryKey: ["tableOrder", branchId, tableNo, currentDate],
      queryFn: () => getChkByTableNo(branchId, tableNo, currentDate),
      enabled: branchId !== null,
    });
  };