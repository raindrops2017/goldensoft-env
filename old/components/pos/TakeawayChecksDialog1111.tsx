import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useOpenTakeawayChecks } from "@/hooks/queries/useOpenTakeawayChecks";
import { ChkHead } from "@/types/check.types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (check: ChkHead) => void;
}

export default function TakeawayChecksDialog({ isOpen, onClose, onSelect }: Props) {
  const { data: checks, isLoading } = useOpenTakeawayChecks();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Open Takeaway Checks</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              Loading checks...
            </div>
          ) : !checks || checks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No open takeaway checks found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell isHeader>Check #</TableCell>
                  <TableCell isHeader>Time</TableCell>
                  <TableCell isHeader>Items</TableCell>
                  <TableCell isHeader>Total</TableCell>
                  <TableCell isHeader className="text-right">Action</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checks.map((check) => {
                    const total = (check as any).total || 0;
                    const itemsCount = check.ChkDetails?.length || 0;
                    return (
                        <TableRow key={check.chk_no}>
                          <TableCell className="font-medium">#{check.chk_no}</TableCell>
                          <TableCell>{check.chk_time}</TableCell>
                          <TableCell>{itemsCount} items</TableCell>
                          <TableCell>{total.toFixed(2)} EGP</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" onClick={() => onSelect(check)}>
                              Open
                            </Button>
                          </TableCell>
                        </TableRow>
                    )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
