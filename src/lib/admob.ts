import { generateIntegrityChecksum, verifyIntegrityChecksum } from "@/lib/security";

export interface AdMobConfig {
  enabled: boolean;
  testMode: boolean;
  publisherId: string; // e.g. "ca-app-pub-3940256099942544"
  bannerSlotHome: string; // e.g. "6300978111"
  bannerSlotListing: string;
  bannerSlotSearch: string;
  nativeAdSlot: string;
  showOnHome: boolean;
  showOnListings: boolean;
  showOnSearch: boolean;
  checksum?: string;
}

export const DEFAULT_ADMOB_CONFIG: AdMobConfig = {
  enabled: true,
  testMode: false,
  publisherId: "ca-app-pub-0000000000000000", // Production Google AdMob Publisher ID
  bannerSlotHome: "1000000001",
  bannerSlotListing: "1000000002",
  bannerSlotSearch: "1000000003",
  nativeAdSlot: "1000000004",
  showOnHome: true,
  showOnListings: true,
  showOnSearch: true,
};

export function getAdMobConfig(): AdMobConfig {
  try {
    const saved = localStorage.getItem("olkv_admob_config");
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_ADMOB_CONFIG, ...parsed };
    }
  } catch {
    // ignore
  }
  return DEFAULT_ADMOB_CONFIG;
}

export async function saveAdMobConfig(cfg: Partial<AdMobConfig>): Promise<AdMobConfig> {
  const current = getAdMobConfig();
  const next = { ...current, ...cfg };

  // Calculate SHA-256 integrity checksum to protect against tampering
  const checksum = await generateIntegrityChecksum({
    publisherId: next.publisherId,
    bannerSlotHome: next.bannerSlotHome,
    bannerSlotListing: next.bannerSlotListing,
    bannerSlotSearch: next.bannerSlotSearch,
    enabled: next.enabled,
    testMode: next.testMode,
  });

  next.checksum = checksum;
  localStorage.setItem("olkv_admob_config", JSON.stringify(next));
  return next;
}
