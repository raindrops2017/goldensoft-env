import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a random UUID v4 string.
 * Falls back to crypto.getRandomValues or Math.random if crypto.randomUUID is not available (e.g. insecure contexts).
 */
export function safeRandomUUID(): string {
  if (typeof window !== "undefined" && window.crypto) {
    if (typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    if (typeof window.crypto.getRandomValues === "function") {
      const tempArray = new Uint8Array(16);
      window.crypto.getRandomValues(tempArray);
      // Set version (4) and variant (8, 9, a, or b) bits
      tempArray[6] = (tempArray[6] & 0x0f) | 0x40;
      tempArray[8] = (tempArray[8] & 0x3f) | 0x80;
      
      const hex: string[] = [];
      for (let i = 0; i < 16; i++) {
        hex.push(tempArray[i].toString(16).padStart(2, "0"));
      }
      return [
        hex.slice(0, 4).join(""),
        hex.slice(4, 6).join(""),
        hex.slice(6, 8).join(""),
        hex.slice(8, 10).join(""),
        hex.slice(10, 16).join("")
      ].join("-");
    }
  }

  // Fallback using Math.random
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

