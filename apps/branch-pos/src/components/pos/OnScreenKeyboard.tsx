import { Delete, Languages } from "lucide-react";

const EN_ROW1 = "qwertyuiop";
const EN_ROW2 = "asdfghjkl";
const EN_ROW3 = "zxcvbnm";
const EN_ROW4 = ".,!?'-";

const AR_ROW1 = "دجحخهعغفقثصض";  //"دجحخهعغفقثصض"
const AR_ROW2 = "طكمنتالبيسش";  //"طكمنتلبسش"
const AR_ROW3 = "ظزوةىلارؤءئ";  //"كنتلارؤء"
const AR_ROW4 = "ذ-؟؛،";  //"ء-؟؛،"

export type KeyboardLang = "en" | "ar";

interface Props {
  onKey: (key: string) => void;
  lang: KeyboardLang;
  onLangChange: (lang: KeyboardLang) => void;
}

function Key({
  char,
  wide,
  size = "normal",
  onPress,
}: {
  char: string;
  wide?: boolean;
  size?: "normal" | "large";
  onPress: (key: string) => void;
}) {
  const sizeClasses =
    size === "large"
      ? "min-w-[44px] h-12 lg:min-w-[52px] lg:h-14 text-base lg:text-lg"
      : "min-w-[32px] h-9 lg:min-w-[40px] lg:h-11 text-sm lg:text-base";

  return (
    <button
      type="button"
      onClick={() => onPress(char)}
      className={`${sizeClasses} rounded-lg lg:rounded-xl
        bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600
        text-gray-900 dark:text-white font-medium
        active:scale-95 transition-transform select-none
        ${wide ? "flex-1 max-w-[140px] lg:max-w-[180px]" : ""}`}
    >
      {char}
    </button>
  );
}

/** On-screen keyboard for touch screens. Hidden on mobile (native keyboard used). */
export default function OnScreenKeyboard({ onKey, lang, onLangChange }: Props) {

  const r1 = lang === "en" ? EN_ROW1 : AR_ROW1;
  const r2 = lang === "en" ? EN_ROW2 : AR_ROW2;
  const r3 = lang === "en" ? EN_ROW3 : AR_ROW3;
  const r4 = lang === "en" ? EN_ROW4 : AR_ROW4;

  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <div
      dir={dir}
      className="hidden lg:block w-full mt-3 p-3 lg:p-4 rounded-xl bg-gray-100 dark:bg-gray-800/80"
    >
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => onLangChange(lang === "en" ? "ar" : "en")}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700
            hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm font-medium"
        >
          <Languages size={16} />
          {lang === "en" ? "EN" : "عربي"}
        </button>
      </div>
      <div className="flex flex-wrap justify-center gap-1.5 lg:gap-2 max-w-2xl mx-auto">
        <div className="flex justify-center gap-1 lg:gap-1.5 w-full">
          {r1.split("").map((c) => (
            <Key key={c} char={c} size="large" onPress={onKey} />
          ))}
        </div>
        <div className="flex justify-center gap-1 lg:gap-1.5 w-full">
          {r2.split("").map((c) => (
            <Key key={c} char={c} size="large" onPress={onKey} />
          ))}
        </div>
        <div className="flex justify-center gap-1 lg:gap-1.5 w-full">
          {r3.split("").map((c) => (
            <Key key={c} char={c} size="large" onPress={onKey} />
          ))}
        </div>
        <div className="flex justify-center gap-1 lg:gap-1.5 w-full">
          <Key char=" " wide size="large" onPress={onKey} />
          {r4.split("").map((c) => (
            <Key key={c} char={c} size="large" onPress={onKey} />
          ))}
          <button
            type="button"
            onClick={() => onKey("backspace")}
            className="min-w-[48px] lg:min-w-[56px] h-12 lg:h-14 rounded-lg lg:rounded-xl
              bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500
              text-gray-900 dark:text-white flex items-center justify-center
              active:scale-95 transition-transform"
          >
            <Delete size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
