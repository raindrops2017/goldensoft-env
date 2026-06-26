interface Props {
  subtotal: number;
  discount: number;
  discountPrsn: number;
  tax: number;
  enttax: number;
  service: number;
  total: number;
  hideService?: boolean;
  hideEntTax?: boolean;
}

export function CartFooter({
  subtotal,
  discount,
  discountPrsn,
  tax,
  enttax,
  service,
  total,
  hideService,
  hideEntTax,
}: Props) {
  return (
    <>
      <div className="px-4 py-4 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/80 dark:to-gray-800 border-t dark:border-gray-700">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Order Summary
        </h3>
        <div className="space-y-2">
          {[
            { label: "Subtotal", value: subtotal },
            {
              label:
                discountPrsn > 0 ? `Discount (${discountPrsn}%)` : "Discount",
              value: discount, hide: discount === 0,
            },
            { label: "Service", value: service, hide: hideService },
            { label: "Tax", value: tax },
            { label: "Ent Tax", value: enttax, hide: hideEntTax || enttax === 0 },
          ]
            .filter((row) => !row.hide)
            .map(({ label, value }) => (
              <div
                key={label}
                className="flex justify-between items-center text-sm"
              >
                <span className="text-gray-600 dark:text-gray-400">
                  {label}
                </span>
                <span className="font-mono font-medium text-gray-900 dark:text-white">
                  {value.toFixed(2)} EGP
                </span>
              </div>
            ))}
        </div>
      </div>
      <div className="px-4 py-4 bg-gradient-to-r from-brand-500 to-brand-600 dark:from-brand-600 dark:to-brand-700 text-white">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">TOTAL</span>
          <span className="text-2xl font-bold">{total.toFixed(2)} EGP</span>
        </div>
      </div>
    </>
  );
}
