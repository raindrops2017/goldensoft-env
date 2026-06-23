export interface CalculationOptions {
  serviceChargePercent: number;
  taxPercent: number;
  entTax: number;
}

export interface CalculableItem {
  qty: number;
  entQty: number;
  itemPrice: number;
  modifiers?: { price: number; qty: number }[];
}

export function calculateCheckTotals(
  items: CalculableItem[],
  discount: number,
  deliveryCharge: number,
  options: CalculationOptions
) {
  let totalItemsValue = 0;
  
  for (const item of items) {
    // qty is already reduced when voided, so only subtract entQty for billing
    const billableQty = Math.max(0, item.qty - item.entQty);
    let itemTotal = item.itemPrice;
    
    // Add modifier prices
    if (item.modifiers && item.modifiers.length > 0) {
      for (const mod of item.modifiers) {
        itemTotal += mod.price * mod.qty;
      }
    }
    
    totalItemsValue += itemTotal * billableQty;
  }

  // Follow exact mathematical formula
  const net = Math.max(0, totalItemsValue - discount);
  const service = net * (options.serviceChargePercent / 100);
  const tax = (net + service + deliveryCharge) * (options.taxPercent / 100);
  
  let enttax = 0;
  if (options.entTax > 0) {
    enttax = (net + service) * (options.entTax / 100);
  }

  const total = net + service + deliveryCharge + tax + enttax;

  return {
    totalItemsValue,
    net: Math.round(net * 100) / 100,
    serviceCharge: Math.round(service * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    entTax: Math.round(enttax * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}
