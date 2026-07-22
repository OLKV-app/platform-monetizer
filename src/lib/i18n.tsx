import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "ml";

type Dict = Record<string, { en: string; ml: string }>;

export const DICT: Dict = {
  tagline: { en: "Buy • Sell • Connect", ml: "വാങ്ങുക • വിൽക്കുക • ബന്ധിപ്പിക്കുക" },
  search_placeholder: { en: "Search items, boats, or jobs…", ml: "സാധനങ്ങൾ, ബോട്ടുകൾ, ജോലി തിരയുക…" },
  home: { en: "Home", ml: "ഹോം" },
  search: { en: "Search", ml: "തിരയുക" },
  sell: { en: "Sell", ml: "വിൽക്കുക" },
  chats: { en: "Chats", ml: "ചാറ്റുകൾ" },
  profile: { en: "Profile", ml: "പ്രൊഫൈൽ" },
  categories: { en: "Categories", ml: "വിഭാഗങ്ങൾ" },
  featured: { en: "Featured Today", ml: "ഇന്നത്തെ ഫീച്ചർ" },
  latest: { en: "Latest Listings", ml: "പുതിയ പരസ്യങ്ങൾ" },
  nearby: { en: "Near You", ml: "സമീപത്ത്" },
  view_all: { en: "View all", ml: "എല്ലാം കാണുക" },
  new: { en: "New", ml: "പുതിയത്" },
  used: { en: "Used", ml: "ഉപയോഗിച്ചത്" },
  sign_in: { en: "Sign in", ml: "സൈൻ ഇൻ" },
  sign_up: { en: "Sign up", ml: "സൈൻ അപ്പ്" },
  sign_out: { en: "Sign out", ml: "സൈൻ ഔട്ട്" },
  email: { en: "Email", ml: "ഇമെയിൽ" },
  password: { en: "Password", ml: "പാസ്‌വേഡ്" },
  full_name: { en: "Full name", ml: "മുഴുവൻ പേര്" },
  phone: { en: "Phone number", ml: "ഫോൺ നമ്പർ" },
  forgot_password: { en: "Forgot password?", ml: "പാസ്‌വേഡ് മറന്നോ?" },
  continue_with_google: { en: "Continue with Google", ml: "Google ഉപയോഗിച്ച് തുടരുക" },
  send_otp: { en: "Send OTP", ml: "OTP അയയ്ക്കുക" },
  verify_otp: { en: "Verify OTP", ml: "OTP സ്ഥിരീകരിക്കുക" },
  title: { en: "Title", ml: "തലക്കെട്ട്" },
  description: { en: "Description", ml: "വിവരണം" },
  price: { en: "Price (₹)", ml: "വില (₹)" },
  category: { en: "Category", ml: "വിഭാഗം" },
  island: { en: "Island", ml: "ദ്വീപ്" },
  location: { en: "Location (area)", ml: "സ്ഥലം" },
  condition: { en: "Condition", ml: "അവസ്ഥ" },
  contact_number: { en: "Contact number", ml: "കോൺടാക്റ്റ് നമ്പർ" },
  publish: { en: "Publish", ml: "പ്രസിദ്ധീകരിക്കുക" },
  photos: { en: "Photos (up to 10)", ml: "ഫോട്ടോകൾ (10 വരെ)" },
  call: { en: "Call", ml: "വിളിക്കുക" },
  whatsapp: { en: "WhatsApp", ml: "വാട്സാപ്പ്" },
  chat: { en: "Chat", ml: "ചാറ്റ്" },
  save: { en: "Save", ml: "സേവ്" },
  report: { en: "Report", ml: "റിപ്പോർട്ട്" },
  share: { en: "Share", ml: "ഷെയർ" },
  my_ads: { en: "My Ads", ml: "എന്റെ പരസ്യങ്ങൾ" },
  favourites: { en: "Favourites", ml: "പ്രിയപ്പെട്ടവ" },
  edit_profile: { en: "Edit Profile", ml: "പ്രൊഫൈൽ എഡിറ്റ്" },
  settings: { en: "Settings", ml: "ക്രമീകരണങ്ങൾ" },
  notifications: { en: "Notifications", ml: "അറിയിപ്പുകൾ" },
  admin: { en: "Admin", ml: "അഡ്മിൻ" },
  dark_mode: { en: "Dark mode", ml: "ഡാർക്ക് മോഡ്" },
  language: { en: "Language", ml: "ഭാഷ" },
  pending_review: { en: "Pending review", ml: "അവലോകനത്തിലാണ്" },
  approved: { en: "Approved", ml: "അംഗീകരിച്ചു" },
  rejected: { en: "Rejected", ml: "നിരസിച്ചു" },
  sold: { en: "Sold", ml: "വിറ്റു" },
};

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof DICT) => string;
}
const LangContext = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const stored = typeof window !== "undefined" ? (localStorage.getItem("olkv-lang") as Lang | null) : null;
    if (stored === "en" || stored === "ml") setLangState(stored);
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("olkv-lang", l);
  };
  const t = (key: keyof typeof DICT) => DICT[key]?.[lang] ?? String(key);
  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}
