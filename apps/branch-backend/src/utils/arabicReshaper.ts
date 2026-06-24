// Contextual shapes for Arabic characters (Isolated, End/Final, Medial, Beginning/Initial)
interface ArabicShape {
  isolated: number;
  final: number;
  medial: number;
  initial: number;
}

const ARABIC_MAP: Record<number, ArabicShape> = {
  // Hamza & Alef variants
  0x0621: { isolated: 0xFE80, final: 0xFE80, medial: 0xFE80, initial: 0xFE80 }, // Hamza ء
  0x0622: { isolated: 0xFE81, final: 0xFE82, medial: 0xFE82, initial: 0xFE81 }, // Alef Madda آ
  0x0623: { isolated: 0xFE83, final: 0xFE84, medial: 0xFE84, initial: 0xFE83 }, // Alef Hamza Above أ
  0x0624: { isolated: 0xFE85, final: 0xFE86, medial: 0xFE86, initial: 0xFE85 }, // Waw Hamza Above ؤ
  0x0625: { isolated: 0xFE87, final: 0xFE88, medial: 0xFE88, initial: 0xFE87 }, // Alef Hamza Below إ
  0x0626: { isolated: 0xFE89, final: 0xFE8A, medial: 0xFE8C, initial: 0xFE8B }, // Yaa Hamza Above ئ
  0x0627: { isolated: 0xFE8D, final: 0xFE8E, medial: 0xFE8E, initial: 0xFE8D }, // Alef ا

  // Standard Consonants
  0x0628: { isolated: 0xFE8F, final: 0xFE90, medial: 0xFE92, initial: 0xFE91 }, // Baa ب
  0x0629: { isolated: 0xFE93, final: 0xFE94, medial: 0xFE94, initial: 0xFE93 }, // Taa Marbuta ة
  0x062A: { isolated: 0xFE95, final: 0xFE96, medial: 0xFE98, initial: 0xFE97 }, // Taa ت
  0x062B: { isolated: 0xFE99, final: 0xFE9A, medial: 0xFE9C, initial: 0xFE9B }, // Thaa ث
  0x062C: { isolated: 0xFE9D, final: 0xFE9E, medial: 0xFEA0, initial: 0xFE9F }, // Jeem ج
  0x062D: { isolated: 0xFEA1, final: 0xFEA2, medial: 0xFEA4, initial: 0xFEA3 }, // Haa ح
  0x062E: { isolated: 0xFEA5, final: 0xFEA6, medial: 0xFEA8, initial: 0xFEA7 }, // Khaa خ
  0x062F: { isolated: 0xFEA9, final: 0xFEAA, medial: 0xFEAA, initial: 0xFEA9 }, // Dal د
  0x0630: { isolated: 0xFEAB, final: 0xFEAC, medial: 0xFEAC, initial: 0xFEAB }, // Thal ذ
  0x0631: { isolated: 0xFEAD, final: 0xFEAE, medial: 0xFEAE, initial: 0xFEAD }, // Raa ر
  0x0632: { isolated: 0xFEAF, final: 0xFEB0, medial: 0xFEB0, initial: 0xFEAF }, // Zay ز
  0x0633: { isolated: 0xFEB1, final: 0xFEB2, medial: 0xFEB4, initial: 0xFEB3 }, // Seen س
  0x0634: { isolated: 0xFEB5, final: 0xFEB6, medial: 0xFEB8, initial: 0xFEB7 }, // Sheen ش
  0x0635: { isolated: 0xFEB9, final: 0xFEBA, medial: 0xFEBC, initial: 0xFEBB }, // Saad ص
  0x0636: { isolated: 0xFEBD, final: 0xFEBE, medial: 0xFEC0, initial: 0xFEBF }, // Daad ض
  0x0637: { isolated: 0xFEC1, final: 0xFEC2, medial: 0xFEC4, initial: 0xFEC3 }, // Taa ط
  0x0638: { isolated: 0xFEC5, final: 0xFEC6, medial: 0xFEC8, initial: 0xFEC7 }, // Zaa ظ
  0x0639: { isolated: 0xFEC9, final: 0xFECA, medial: 0xFECC, initial: 0xFECB }, // Ain ع
  0x063A: { isolated: 0xFECD, final: 0xFECE, medial: 0xFED0, initial: 0xFECF }, // Ghain غ
  0x0641: { isolated: 0xFED1, final: 0xFED2, medial: 0xFED4, initial: 0xFED3 }, // Faa ف
  0x0642: { isolated: 0xFED5, final: 0xFED6, medial: 0xFED8, initial: 0xFED7 }, // Qaaf ق
  0x0643: { isolated: 0xFED9, final: 0xFEDA, medial: 0xFEDC, initial: 0xFEDB }, // Kaaf ك
  0x0644: { isolated: 0xFEDD, final: 0xFEDE, medial: 0xFEE0, initial: 0xFEDF }, // Laam ل
  0x0645: { isolated: 0xFEE1, final: 0xFEE2, medial: 0xFEE4, initial: 0xFEE3 }, // Meem م
  0x0646: { isolated: 0xFEE5, final: 0xFEE6, medial: 0xFEE8, initial: 0xFEE7 }, // Noon ن
  0x0647: { isolated: 0xFEE9, final: 0xFEEA, medial: 0xFEEC, initial: 0xFEEB }, // Haa ه
  0x0648: { isolated: 0xFEED, final: 0xFEEE, medial: 0xFEEE, initial: 0xFEED }, // Waw و
  0x0649: { isolated: 0xFEEF, final: 0xFEF0, medial: 0xFEF0, initial: 0xFEEF }, // Alef Maksura ى
  0x064A: { isolated: 0xFEF1, final: 0xFEF2, medial: 0xFEF4, initial: 0xFEF3 }, // Yaa ي
};

// Character helper properties
function connectsToRight(char: string): boolean {
  if (!char) return false;
  const code = char.charCodeAt(0);
  // Connects if standard Arabic consonant/vowel (excluding standalone hamza)
  return code >= 0x0621 && code <= 0x064A && code !== 0x0621;
}

function connectsToLeft(char: string): boolean {
  if (!char) return false;
  const code = char.charCodeAt(0);
  // Standard Arabic letters that DO NOT connect to the left
  const nonLeftConnectors = [
    0x0621, // Hamza ء
    0x0622, // Alef Madda آ
    0x0623, // Alef Hamza Above أ
    0x0624, // Waw Hamza Above ؤ
    0x0625, // Alef Hamza Below إ
    0x0627, // Alef ا
    0x062F, // Dal د
    0x0630, // Thal ذ
    0x0631, // Raa ر
    0x0632, // Zay ز
    0x0648, // Waw و
    0x0649, // Alef Maksura ى (sometimes treated as non-connecting depending on font, but generally acts like alef)
    0x0629, // Taa Marbuta ة
  ];
  return code >= 0x0621 && code <= 0x064A && !nonLeftConnectors.includes(code);
}

// Checks if character is inside the Arabic Unicode block
function isArabicChar(char: string): boolean {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return (code >= 0x0600 && code <= 0x06FF) || (code >= 0xFE70 && code <= 0xFEFF);
}

// Reshapes Arabic string contextually
export function reshapeArabic(text: string): string {
  if (!text) return '';

  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);

    if (!isArabicChar(char)) {
      result += char;
      continue;
    }

    // 1. Handle Laam-Alef ligatures (ل + ا)
    if (code === 0x0644 && i + 1 < text.length) {
      const nextChar = text[i + 1];
      const nextCode = nextChar.charCodeAt(0);
      const isAlef = [0x0622, 0x0623, 0x0625, 0x0627].includes(nextCode);

      if (isAlef) {
        const prev = text[i - 1];
        const prevConnects = connectsToLeft(prev);

        let ligatureCode = 0xFEFB; // Isolated لا
        if (nextCode === 0x0622) ligatureCode = 0xFEF5; // لآ
        else if (nextCode === 0x0623) ligatureCode = 0xFEF7; // لأ
        else if (nextCode === 0x0625) ligatureCode = 0xFEF9; // لإ

        if (prevConnects) {
          ligatureCode += 1; // Maps to Final form (e.g. 0xFEFC, 0xFEF6, etc.)
        }

        result += String.fromCharCode(ligatureCode);
        i++; // skip next char
        continue;
      }
    }

    const prev = text[i - 1];
    const next = text[i + 1];

    const prevConnects = connectsToLeft(prev);
    const nextConnects = connectsToRight(next);

    const map = ARABIC_MAP[code];
    if (!map) {
      result += char;
      continue;
    }

    if (prevConnects && nextConnects) {
      result += String.fromCharCode(map.medial);
    } else if (prevConnects) {
      result += String.fromCharCode(map.final);
    } else if (nextConnects) {
      result += String.fromCharCode(map.initial);
    } else {
      result += String.fromCharCode(map.isolated);
    }
  }

  return result;
}

// Reverses shaped Arabic segments for printing RTL while leaving numbers/English LTR
export function reshapeAndReverseArabic(text: string): string {
  if (!text) return '';
  
  // 1. Reshape the Arabic characters first
  const shaped = reshapeArabic(text);

  // 2. Tokenize into runs of Arabic vs. Non-Arabic
  // We want to reverse the order of characters inside Arabic segments,
  // but keep numbers or English words in correct order.
  const regex = /([\u0600-\u06FF\uFE70-\uFEFF\s]+)/g;
  const parts = shaped.split(regex);
  
  return parts.map((part) => {
    // If it's a block of Arabic characters and spaces, shape/reverse
    if (/[\u0600-\u06FF\uFE70-\uFEFF]/.test(part)) {
      // Split words and reverse characters of each word, and reverse order of words
      // Simple character-level reverse works for Arabic-only segments
      // But we need to make sure numbers inside Arabic are not reversed.
      // E.g. "بيتزا 1" -> character-wise reverse "1 ا ز ت ي ب" which is wrong for the number.
      // So we split by numbers to keep numbers intact.
      const subParts = part.split(/(\d+)/);
      const reversedSubParts = subParts.map((sub) => {
        if (/^\d+$/.test(sub)) {
          return sub; // keep numbers LTR
        }
        return sub.split('').reverse().join('');
      });
      return reversedSubParts.reverse().join('');
    }
    return part; // keep English/numbers LTR
  }).join('');
}
