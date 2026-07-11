import net from 'net';
import fs from 'fs';
import path from 'path';
import iconv from 'iconv-lite';
import { reshapeAndReverseArabic } from '../../utils/arabicReshaper';
import type { CheckWithItems } from '@goldensoft/core-schemas';

// ESC/POS Command Constants
const ESC = 0x1B;
const GS = 0x1D;

const CMD_INIT = Buffer.from([ESC, 0x40]);
const CMD_ALIGN_LEFT = Buffer.from([ESC, 0x61, 0x00]);
const CMD_ALIGN_CENTER = Buffer.from([ESC, 0x61, 0x01]);
const CMD_ALIGN_RIGHT = Buffer.from([ESC, 0x61, 0x02]);
const CMD_BOLD_ON = Buffer.from([ESC, 0x45, 0x01]);
const CMD_BOLD_OFF = Buffer.from([ESC, 0x45, 0x00]);
const CMD_SIZE_DOUBLE = Buffer.from([GS, 0x21, 0x11]); // Double width & height
const CMD_SIZE_NORMAL = Buffer.from([GS, 0x21, 0x00]);
const CMD_SELECT_CP1256 = Buffer.from([ESC, 0x74, 0x16]); // CP1256 (Windows-1256 Arabic)
const CMD_CUT_PAPER = Buffer.from([GS, 0x56, 0x42, 0x00]); // Feed and cut

export interface PrinterConfig {
  name: string;
  ipAddress: string;
  port: number;
}

export class ChecksPrinter {
  private width = 42; // Standard 80mm thermal receipt printer column width

  /**
   * Encodes a string into Windows-1256, shaping and reversing Arabic blocks contextually.
   */
  private encodeBilingualText(text: string): Buffer {
    // 1. Process Arabic letters (shaping + reversal)
    const processed = reshapeAndReverseArabic(text);
    // 2. Encode string to Windows-1256 Arabic encoding
    return iconv.encode(processed, 'windows-1256');
  }

  private centerLine(text: string): string {
    const pad = Math.max(0, Math.floor((this.width - text.length) / 2));
    return ' '.repeat(pad) + text;
  }

  private justifyLine(left: string, right: string): string {
    const totalLen = left.length + right.length;
    if (totalLen >= this.width) {
      return left + ' ' + right;
    }
    const spaces = ' '.repeat(this.width - totalLen);
    return left + spaces + right;
  }

  private drawDivider(char: string = '-'): string {
    return char.repeat(this.width);
  }

  /**
   * Generates a printable receipt buffer and a plaintext layout string.
   */
  formatReceipt(check: CheckWithItems): { escposBuffer: Buffer; textContent: string } {
    const lines: string[] = [];
    const commands: Buffer[] = [];

    // Initialize printer and select Code Page 1256
    commands.push(CMD_INIT);
    commands.push(CMD_SELECT_CP1256);

    const appendLine = (text: string, options?: { align?: 'left' | 'center' | 'right'; bold?: boolean; size?: 'normal' | 'double' }) => {
      lines.push(text);

      // Construct ESC/POS command buffers for this line
      const lineCommands: Buffer[] = [];
      
      if (options?.align === 'center') lineCommands.push(CMD_ALIGN_CENTER);
      else if (options?.align === 'right') lineCommands.push(CMD_ALIGN_RIGHT);
      else lineCommands.push(CMD_ALIGN_LEFT);

      if (options?.bold) lineCommands.push(CMD_BOLD_ON);
      if (options?.size === 'double') lineCommands.push(CMD_SIZE_DOUBLE);

      lineCommands.push(this.encodeBilingualText(text + '\n'));

      if (options?.size === 'double') lineCommands.push(CMD_SIZE_NORMAL);
      if (options?.bold) lineCommands.push(CMD_BOLD_OFF);

      commands.push(Buffer.concat(lineCommands));
    };

    // --- RECEIPT HEADERS ---
    appendLine('GOLDEN SOFT RESTAURANT', { align: 'center', bold: true, size: 'double' });
    appendLine('مطعم جولدن سوفت', { align: 'center', bold: true });
    appendLine('Cairo, Egypt - Ph: 02-23456789', { align: 'center' });
    appendLine(this.drawDivider('='), { align: 'center' });

    // --- RECEIPT META DATA ---
    // Date & Time
    const dateStr = check.chkDate;
    const timeStr = check.chkTime;
    appendLine(this.justifyLine(`Date: ${dateStr}`, `Time: ${timeStr}`));
    
    // Check & Table Info
    const chkNoStr = `Check #: ${check.chkNo}`;
    const tableStr = check.checkKindId === 2 ? 'Order: Delivery' : (check.tableName ? `Table: ${check.tableName}` : 'Order: Takeaway');
    appendLine(this.justifyLine(chkNoStr, tableStr));

    // Waiter & Cashier Info
    const waiterName = check.waiterId ? `Waiter: #${check.waiterId.slice(0, 4)}` : 'Waiter: System';
    const cashierName = check.cashierId ? `Cashier: #${check.cashierId.slice(0, 4)}` : 'Cashier: System';
    appendLine(this.justifyLine(waiterName, cashierName));

    const guestCountStr = `Guests: ${check.guestCount}`;
    const printCountStr = `Prints: ${check.printCount + 1}`; // +1 represents this current print
    appendLine(this.justifyLine(guestCountStr, printCountStr));
    appendLine(this.drawDivider('-'), { align: 'center' });

    // --- DELIVERY METADATA BLOCK ---
    if (check.checkKindId === 2) {
      appendLine('DELIVERY DETAILS / تفاصيل التوصيل', { bold: true });
      const customerName = check.customerName || check.deliveryCustomer?.name || "";
      const primaryPhoneObj = check.deliveryCustomer?.phones?.find((p: any) => p.isDefault) || check.deliveryCustomer?.phones?.[0];
      const customerPhone = check.customerPhone || primaryPhoneObj?.phone || "";
      const primaryAddrObj = check.deliveryCustomer?.addresses?.find((a: any) => a.isDefault) || check.deliveryCustomer?.addresses?.[0];
      const address = check.deliveryAddress || primaryAddrObj?.address || "";
      const floor = check.deliveryFloor || primaryAddrObj?.floor || "";
      const unit = check.deliveryUnit || primaryAddrObj?.unit || "";
      const landmark = check.deliveryLandmark || primaryAddrObj?.landmark || "";
      const notes = check.deliveryNotes || primaryAddrObj?.notes || "";

      if (customerName) appendLine(`Customer: ${customerName}`);
      if (customerPhone) appendLine(`Phone: ${customerPhone}`);
      if (address) appendLine(`Address: ${address}`);
      const floorStr = floor ? `Floor: ${floor}` : '';
      const unitStr = unit ? `Unit: ${unit}` : '';
      const details = [floorStr, unitStr].filter(Boolean).join(', ');
      if (details) appendLine(details);
      if (landmark) appendLine(`Landmark: ${landmark}`);
      if (notes) appendLine(`Deliv Notes: ${notes}`);
      if (check.deliveryZone) {
        appendLine(`Zone: ${check.deliveryZone.name}`);
      }
      if (check.deliveryPilot) {
        appendLine(`Pilot: ${check.deliveryPilot.name}`);
      }
      appendLine(this.drawDivider('-'), { align: 'center' });
    }

    // --- ITEMS LIST ---
    appendLine(this.justifyLine('Item / الصنف', 'Qty x Price   Total'), { bold: true });
    appendLine(this.drawDivider('-'), { align: 'center' });

    // Print active items (excluding voided items)
    if (check.items) {
      for (const item of check.items) {
        // Exclude fully voided items
        const activeQty = item.qty;
        if (activeQty <= 0) continue;

        const compQty = item.entQty || 0;
        const paidQty = Math.max(0, activeQty - compQty);

        // Bilingual Item Name format: English Name / Arabic Name
        const namePart = item.arabicName 
          ? `${item.itemName} / ${item.arabicName}`
          : item.itemName || 'Menu Item';

        // 1. Print Paid portion (if any)
        if (paidQty > 0) {
          const itemPrice = item.itemPrice;
          const itemTotal = paidQty * itemPrice;
          const pricingText = `${paidQty} x ${itemPrice.toFixed(2)}`;
          const totalText = `${itemTotal.toFixed(2)} EGP`;

          appendLine(namePart);
          appendLine(this.justifyLine(`  ${pricingText}`, totalText));

          // Display modifiers for paid portion (if any)
          if (item.modifiers && item.modifiers.length > 0) {
            for (const mod of item.modifiers) {
              const modPrice = mod.price || 0;
              const modTotal = (mod.qty || 1) * modPrice;
              const modName = mod.name ? ` + ${mod.name}` : ' + Modifier';
              const modPriceText = `${mod.qty || 1} x ${modPrice.toFixed(2)}`;
              
              appendLine(modName);
              appendLine(this.justifyLine(`    ${modPriceText}`, `${modTotal.toFixed(2)} EGP`));
            }
          }
        }

        // 2. Print Comped portion (if any)
        if (compQty > 0) {
          const itemPrice = 0;
          const itemTotal = 0;

          appendLine(namePart, { bold: true });
          appendLine(this.justifyLine('  ** COMP / ضيافة **', `${itemTotal.toFixed(2)} EGP`));
          
          // Display modifiers for comped portion (if any)
          if (item.modifiers && item.modifiers.length > 0) {
            for (const mod of item.modifiers) {
              const modPrice = 0;
              const modTotal = 0;
              const modName = mod.name ? ` + ${mod.name}` : ' + Modifier';
              const modPriceText = `${mod.qty || 1} x ${modPrice.toFixed(2)}`;
              
              appendLine(modName);
              appendLine(this.justifyLine(`    ${modPriceText}`, `${modTotal.toFixed(2)} EGP`));
            }
          }
        }
      }
    }

    appendLine(this.drawDivider('-'), { align: 'center' });

    // --- TOTALS SECTION ---
    // Subtotal
    const subtotalText = `${(check.net + check.discount).toFixed(2)} EGP`;
    appendLine(this.justifyLine('Subtotal / المجموع الفرعي', subtotalText));

    // Discount
    if (check.discount > 0) {
      const discountText = `-${check.discount.toFixed(2)} EGP`;
      const discPercentText = check.discountPercent > 0 ? ` (${check.discountPercent}%)` : '';
      appendLine(this.justifyLine(`Discount${discPercentText} / الخصم`, discountText), { bold: true });
    }

    // Service Charge
    if (check.serviceCharge > 0) {
      const serviceText = `+${check.serviceCharge.toFixed(2)} EGP`;
      appendLine(this.justifyLine('Service Charge / الخدمة', serviceText));
    }

    // Taxes
    const taxTotal = (check.tax || 0) + (check.entTax || 0);
    if (taxTotal > 0) {
      const taxText = `+${taxTotal.toFixed(2)} EGP`;
      appendLine(this.justifyLine('Tax / الضريبة', taxText));
    }

    // Delivery Charge
    if (check.deliveryCharge > 0) {
      const deliveryText = `+${check.deliveryCharge.toFixed(2)} EGP`;
      appendLine(this.justifyLine('Delivery / التوصيل', deliveryText));
    }

    appendLine(this.drawDivider('='), { align: 'center' });

    // Net Total (Bold & Larger)
    const netText = `${check.total.toFixed(2)} EGP`;
    appendLine(this.justifyLine('NET TOTAL / الإجمالي', netText), { align: 'left', bold: true });
    appendLine(this.drawDivider('='), { align: 'center' });

    // --- FOOTER ---
    appendLine('Thank you for dining with us!', { align: 'center', bold: true });
    appendLine('شكراً لزيارتكم!', { align: 'center', bold: true });
    appendLine(this.centerLine(`Check #${check.chkNo} - Powered by GoldenSoft`));
    appendLine('\n\n\n'); // Feed lines

    // Paper Cut command
    commands.push(CMD_CUT_PAPER);

    return {
      escposBuffer: Buffer.concat(commands),
      textContent: lines.join('\n')
    };
  }

  /**
   * Tries to send ESC/POS binary data to network printer.
   * If it fails, falls back to printing a mock text file.
   */
  async print(check: CheckWithItems, config: PrinterConfig): Promise<{ success: boolean; mocked: boolean; error?: string }> {
    const { escposBuffer, textContent } = this.formatReceipt(check);

    return new Promise((resolve) => {
      const client = new net.Socket();
      let connected = false;
      let finished = false;

      const handleFallback = (err: any) => {
        if (finished) return;
        finished = true;
        
        try {
          client.destroy();
        } catch (e) {}
        
        console.warn(`[Printer] Direct TCP printing to ${config.ipAddress}:${config.port} failed. Falling back to local file. Error: ${err.message}`);
        
        try {
          const mockPrintsDir = path.join(__dirname, '../../../mock-prints');
          if (!fs.existsSync(mockPrintsDir)) {
            fs.mkdirSync(mockPrintsDir, { recursive: true });
          }

          const safeDate = new Date().toISOString().replace(/[:.]/g, '-');
          const fileName = `receipt-${check.chkNo}-${safeDate}.txt`;
          const filePath = path.join(mockPrintsDir, fileName);

          fs.writeFileSync(filePath, textContent, 'utf-8');
          console.log(`[Printer] Mock receipt written to ${filePath}`);

          resolve({ 
            success: true, 
            mocked: true, 
            error: `Printer offline. Saved check format to mock-prints/${fileName}` 
          });
        } catch (fsErr: any) {
          resolve({ 
            success: false, 
            mocked: true, 
            error: `Failed to write mock print file: ${fsErr.message}` 
          });
        }
      };

      // Set a strict 3-second connection timeout timer
      const connTimeout = setTimeout(() => {
        handleFallback(new Error('Connection timed out (3s limit reached)'));
      }, 3000);

      client.on('error', (err) => {
        clearTimeout(connTimeout);
        handleFallback(err);
      });

      client.connect(config.port, config.ipAddress, () => {
        clearTimeout(connTimeout);
        connected = true;
        finished = true;
        client.write(escposBuffer, () => {
          client.end();
          resolve({ success: true, mocked: false });
        });
      });
    });
  }
}

export const checksPrinter = new ChecksPrinter();
