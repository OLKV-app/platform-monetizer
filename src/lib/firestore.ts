import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  addDoc,
  onSnapshot,
  limit,
} from "firebase/firestore";

// Local storage fallback helpers in case Firebase Firestore rules/network are restricted
function getLocalStorageCache<T>(key: string, defaultVal: T): T {
  if (typeof window === "undefined") return defaultVal;
  try {
    const raw = localStorage.getItem(`fs_cache_${key}`);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setLocalStorageCache(key: string, value: any): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`fs_cache_${key}`, JSON.stringify(value));
  } catch {
    // ignore
  }
}

// Interfaces
export interface UserProfileData {
  id: string; // User ID / UUID
  full_name?: string | null;
  island?: string | null;
  phone?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  hide_contact?: boolean;
  hide_email?: boolean;
  allow_chats?: boolean;
  show_location?: boolean;
  is_banned?: boolean;
  ban_reason?: string | null;
  is_admin?: boolean;
  verified?: boolean;
  verification_status?: string | null;
  terms_accepted_at?: string | null;
  created_at?: any;
  updated_at?: any;
}

export interface ListingData {
  id: string;
  user_id: string;
  title: string;
  description: string;
  price: number;
  category_slug: string;
  condition: "new" | "used";
  island: string;
  location?: string;
  contact_number?: string;
  images?: string[];
  image_url?: string;
  status: "pending" | "approved" | "rejected" | "sold";
  featured?: boolean;
  views_count?: number;
  created_at?: any;
  updated_at?: any;
}

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  image_url?: string;
  description?: string;
  order?: number;
}

export interface BannerData {
  id: string;
  title: string;
  subtitle?: string | null;
  image_url: string;
  link_url?: string | null;
  placement: "home" | "category" | "sidebar";
  banner_type?: string;
  position?: number;
  active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  view_count?: number;
  click_count?: number;
  created_at?: any;
}

export interface BannerRequestData {
  id: string;
  user_id: string;
  title?: string;
  business_name?: string;
  description?: string | null;
  image_url?: string;
  banner_url?: string;
  link_url?: string | null;
  target_url?: string;
  placement?: string;
  banner_type?: string;
  duration_days: number;
  notes?: string | null;
  status: "pending" | "approved" | "rejected" | "live";
  admin_note?: string | null;
  payment_status?: string;
  payment_ref?: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  created_at?: any;
  updated_at?: any;
}

export interface FavouriteData {
  id: string;
  user_id: string;
  listing_id: string;
  created_at?: any;
}

export interface ReviewData {
  id: string;
  listing_id: string;
  reviewer_id: string;
  seller_id: string;
  rating: number;
  comment?: string;
  created_at?: any;
}

export interface ReportData {
  id: string;
  reporter_id: string;
  target_id: string;
  target_type: "listing" | "user" | "chat";
  reason: string;
  details?: string | null;
  listing_id?: string;
  resolved?: boolean;
  status?: "pending" | "resolved" | "dismissed";
  created_at?: any;
}

export interface FeedbackData {
  id: string;
  user_id?: string;
  email?: string;
  subject?: string;
  message: string;
  rating?: number;
  created_at?: any;
}

export interface ChatData {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  last_message?: string;
  updated_at?: any;
  created_at?: any;
  call_enabled?: boolean;
  call_enabled_by?: string | null;
  call_request_status?: "none" | "pending" | "accepted" | "declined";
  call_requested_by?: string | null;
  seller_phone?: string | null;
  participants?: string[];
}

export interface MessageData {
  id: string;
  chat_id: string;
  sender_id: string;
  text: string;
  content?: string;
  created_at?: any;
}

export interface AppSettingData {
  key: string;
  value: string;
}

export interface NotificationData {
  id: string;
  user_id: string;
  title: string;
  body?: string | null;
  link?: string | null;
  read?: boolean;
  created_at?: any;
}

export interface LegalPageData {
  slug: string;
  title: string;
  content: string;
  updated_at?: any;
  updated_by?: string | null;
}

export interface BusinessProfileData {
  user_id: string;
  business_name: string;
  phone?: string;
  email?: string;
  address?: string;
  logo_url?: string;
  verified?: boolean;
}

export interface VerificationRequestData {
  id: string;
  user_id: string;
  full_name?: string;
  document_type?: string;
  document_url?: string;
  id_document_url?: string;
  address_document_url?: string;
  notes?: string | null;
  fee_transaction_id?: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes?: string | null;
  created_at?: any;
}

export interface TransactionData {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  purpose?: string;
  status: string;
  invoice_number?: string;
  provider?: string;
  provider_ref?: string;
  target_id?: string | null;
  currency?: string;
  meta?: any;
  created_at?: any;
}

export interface AppealData {
  id: string;
  user_id: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  admin_note?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at?: any;
}

export interface SubscriptionData {
  id: string;
  user_id: string;
  plan_id: string;
  expires_at?: string;
  expiry_date?: string;
  transaction_id?: string | null;
  status?: string;
  auto_renew?: boolean;
  start_date?: string;
  created_at?: any;
}

export interface SubscriptionPlanData {
  id: string;
  name: string;
  code: string;
  price: number;
  duration_days: number;
  features?: string[];
  benefits?: string[];
  tier?: string;
  ad_free?: boolean;
  is_active?: boolean;
  sort_order?: number;
  active: boolean;
}

export interface PromotionalAdData {
  id: string;
  user_id?: string;
  title: string;
  image_url: string;
  target_url?: string;
  link?: string;
  location?: string;
  status?: string;
  active?: boolean;
  views?: number;
  clicks?: number;
  created_by?: string;
  expiry_date?: string;
  created_at?: any;
}

// DEFAULT INITIAL DATA FOR FALLBACK
const DEFAULT_CATEGORIES: CategoryData[] = [
  {
    id: "vehicles",
    name: "Vehicles",
    slug: "vehicles",
    icon: "Car",
    image_url:
      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&auto=format&fit=crop&q=80",
    order: 1,
  },
  {
    id: "real-estate",
    name: "Real Estate",
    slug: "real-estate",
    icon: "Home",
    image_url:
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&auto=format&fit=crop&q=80",
    order: 2,
  },
  {
    id: "electronics",
    name: "Electronics",
    slug: "electronics",
    icon: "Smartphone",
    image_url:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&auto=format&fit=crop&q=80",
    order: 3,
  },
  {
    id: "jobs",
    name: "Jobs",
    slug: "jobs",
    icon: "Briefcase",
    image_url:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&auto=format&fit=crop&q=80",
    order: 4,
  },
  {
    id: "services",
    name: "Services",
    slug: "services",
    icon: "Wrench",
    image_url:
      "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400&auto=format&fit=crop&q=80",
    order: 5,
  },
  {
    id: "fashion",
    name: "Fashion & Beauty",
    slug: "fashion",
    icon: "ShoppingBag",
    image_url:
      "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&auto=format&fit=crop&q=80",
    order: 6,
  },
  {
    id: "home-garden",
    name: "Home & Garden",
    slug: "home-garden",
    icon: "Sofa",
    image_url:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&auto=format&fit=crop&q=80",
    order: 7,
  },
  {
    id: "boats",
    name: "Boats & Marine",
    slug: "boats",
    icon: "Anchor",
    image_url:
      "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=400&auto=format&fit=crop&q=80",
    order: 8,
  },
];

const DEFAULT_BANNERS: BannerData[] = [
  {
    id: "b1",
    title: "Find Your Dream Car",
    image_url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200",
    placement: "home",
    active: true,
  },
  {
    id: "b2",
    title: "Island Properties for Sale",
    image_url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200",
    placement: "home",
    active: true,
  },
];

// ---------------- Profiles ----------------
export async function getProfileFromFirestore(
  uid: string,
  userAuthInfo?: { phone?: string | null; email?: string | null },
): Promise<UserProfileData | null> {
  if (!uid) return null;
  try {
    const docRef = doc(db, "profiles", uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as UserProfileData;
      const profile = { ...data, email: userAuthInfo?.email || data.email || null };
      setLocalStorageCache(`profile_${uid}`, profile);
      return profile;
    }
  } catch (err) {
    console.warn("Firestore getProfile fallback to cache:", err);
  }

  // Fallback to cache / default
  const cached = getLocalStorageCache<UserProfileData | null>(`profile_${uid}`, null);
  if (cached) return cached;

  const newProfile: UserProfileData = {
    id: uid,
    phone: userAuthInfo?.phone || null,
    email: userAuthInfo?.email || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, "profiles", uid), newProfile, { merge: true });
  } catch {
    // save to local cache
  }

  setLocalStorageCache(`profile_${uid}`, newProfile);
  return newProfile;
}

export async function saveProfileToFirestore(
  uid: string,
  data: Partial<UserProfileData>,
): Promise<void> {
  if (!uid) return;
  const payload = {
    id: uid,
    ...data,
    updated_at: new Date().toISOString(),
  };

  setLocalStorageCache(`profile_${uid}`, payload);

  try {
    await setDoc(doc(db, "profiles", uid), payload, { merge: true });
  } catch (err) {
    console.warn("Firestore saveProfile cached locally:", err);
  }
}

export async function updatePrivacyInFirestore(
  uid: string,
  privacy: Record<string, boolean>,
): Promise<void> {
  await saveProfileToFirestore(uid, privacy);
}

export async function getAllProfilesFromFirestore(): Promise<UserProfileData[]> {
  try {
    const snap = await getDocs(collection(db, "profiles"));
    const profiles = snap.docs.map((d) => d.data() as UserProfileData);
    if (profiles.length > 0) return profiles;
  } catch (err) {
    console.warn("Firestore getAllProfiles fallback:", err);
  }
  return [];
}

// ---------------- Listings ----------------
export async function getListingsFromFirestore(filters?: {
  category_slug?: string;
  status?: string;
  island?: string;
  user_id?: string;
  search?: string;
}): Promise<ListingData[]> {
  let listings: ListingData[] = [];

  try {
    const qConstraints = [];
    if (filters?.category_slug)
      qConstraints.push(where("category_slug", "==", filters.category_slug));
    if (filters?.status) qConstraints.push(where("status", "==", filters.status));
    if (filters?.island) qConstraints.push(where("island", "==", filters.island));
    if (filters?.user_id) qConstraints.push(where("user_id", "==", filters.user_id));

    const q = query(collection(db, "listings"), ...qConstraints);
    const snap = await getDocs(q);
    listings = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ListingData);

    if (listings.length > 0) {
      setLocalStorageCache("all_listings", listings);
    }
  } catch (err) {
    console.warn("Firestore getListings fallback to cache:", err);
    listings = getLocalStorageCache<ListingData[]>("all_listings", []);
  }

  if (filters?.search) {
    const term = filters.search.toLowerCase();
    listings = listings.filter(
      (l) =>
        l.title.toLowerCase().includes(term) ||
        l.description?.toLowerCase().includes(term) ||
        l.island?.toLowerCase().includes(term),
    );
  }

  return listings;
}

export async function getListingByIdFromFirestore(id: string): Promise<ListingData | null> {
  if (!id) return null;
  try {
    const snap = await getDoc(doc(db, "listings", id));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as ListingData;
    }
  } catch (err) {
    console.warn("Firestore getListingById fallback:", err);
  }

  const all = getLocalStorageCache<ListingData[]>("all_listings", []);
  return all.find((l) => l.id === id) || null;
}

export async function createListingInFirestore(
  data: Omit<ListingData, "id">,
): Promise<ListingData> {
  const newId = crypto.randomUUID();
  const listing: ListingData = {
    id: newId,
    ...data,
    views_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, "listings", newId), listing);
  } catch (err) {
    console.warn("Firestore createListing fallback:", err);
  }

  const all = getLocalStorageCache<ListingData[]>("all_listings", []);
  setLocalStorageCache("all_listings", [listing, ...all]);

  return listing;
}

export async function updateListingInFirestore(
  id: string,
  data: Partial<ListingData>,
): Promise<void> {
  if (!id) return;
  const patch = { ...data, updated_at: new Date().toISOString() };

  try {
    await updateDoc(doc(db, "listings", id), patch);
  } catch (err) {
    console.warn("Firestore updateListing fallback:", err);
  }

  const all = getLocalStorageCache<ListingData[]>("all_listings", []);
  const updated = all.map((l) => (l.id === id ? { ...l, ...patch } : l));
  setLocalStorageCache("all_listings", updated);
}

export async function deleteListingFromFirestore(id: string): Promise<void> {
  if (!id) return;
  try {
    await deleteDoc(doc(db, "listings", id));
  } catch (err) {
    console.warn("Firestore deleteListing fallback:", err);
  }

  const all = getLocalStorageCache<ListingData[]>("all_listings", []);
  setLocalStorageCache(
    "all_listings",
    all.filter((l) => l.id !== id),
  );
}

export async function incrementListingViewsInFirestore(id: string): Promise<void> {
  if (!id) return;
  try {
    const listing = await getListingByIdFromFirestore(id);
    if (listing) {
      const newViews = (listing.views_count || 0) + 1;
      await updateListingInFirestore(id, { views_count: newViews });
    }
  } catch {
    // ignore
  }
}

// ---------------- Categories ----------------
export async function getCategoriesFromFirestore(): Promise<CategoryData[]> {
  try {
    const snap = await getDocs(collection(db, "categories"));
    const cats = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CategoryData);
    if (cats.length > 0) return cats;
  } catch (err) {
    console.warn("Firestore getCategories fallback:", err);
  }
  return getLocalStorageCache("categories", DEFAULT_CATEGORIES);
}

export async function saveCategoryToFirestore(cat: Partial<CategoryData>): Promise<void> {
  const id = cat.id || crypto.randomUUID();
  try {
    await setDoc(doc(db, "categories", id), { ...cat, id }, { merge: true });
  } catch (err) {
    console.warn("Firestore saveCategory fallback:", err);
  }
}

export async function deleteCategoryFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "categories", id));
  } catch (err) {
    console.warn("Firestore deleteCategory fallback:", err);
  }
}

// ---------------- Banners ----------------
export async function getBannersFromFirestore(): Promise<BannerData[]> {
  try {
    const snap = await getDocs(collection(db, "banners"));
    const banners = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BannerData);
    if (snap.size > 0 || snap.docs.length > 0) {
      setLocalStorageCache("banners", banners);
      return banners;
    }
  } catch (err) {
    console.warn("Firestore getBanners fallback:", err);
  }
  const cachedRaw = localStorage.getItem("banners");
  if (cachedRaw !== null) {
    try {
      return JSON.parse(cachedRaw);
    } catch {
      // fallback
    }
  }
  return DEFAULT_BANNERS;
}

export async function saveBannerToFirestore(banner: Partial<BannerData>): Promise<void> {
  const id = banner.id || crypto.randomUUID();
  const payload = { ...banner, id };
  try {
    await setDoc(doc(db, "banners", id), payload, { merge: true });
  } catch (err) {
    console.warn("Firestore saveBanner fallback:", err);
  }
  const all = getLocalStorageCache<BannerData[]>("banners", DEFAULT_BANNERS);
  const updated = all.some((b) => b.id === id)
    ? all.map((b) => (b.id === id ? { ...b, ...payload } : b))
    : [...all, payload as BannerData];
  setLocalStorageCache("banners", updated);
}

export async function deleteBannerFromFirestore(id: string): Promise<void> {
  if (!id) return;
  try {
    await deleteDoc(doc(db, "banners", id));
  } catch (err) {
    console.warn("Firestore deleteBanner fallback:", err);
  }
  const all = getLocalStorageCache<BannerData[]>("banners", DEFAULT_BANNERS);
  setLocalStorageCache(
    "banners",
    all.filter((b) => b.id !== id),
  );
}

// ---------------- Banner Requests ----------------
export async function getBannerRequestsFromFirestore(
  userId?: string,
): Promise<BannerRequestData[]> {
  try {
    const qConstraints = [];
    if (userId) qConstraints.push(where("user_id", "==", userId));
    const snap = await getDocs(query(collection(db, "banner_requests"), ...qConstraints));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BannerRequestData);
  } catch (err) {
    console.warn("Firestore getBannerRequests fallback:", err);
    return [];
  }
}

export async function createBannerRequestInFirestore(
  data: Omit<BannerRequestData, "id">,
): Promise<void> {
  const id = crypto.randomUUID();
  try {
    await setDoc(doc(db, "banner_requests", id), {
      id,
      ...data,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Firestore createBannerRequest fallback:", err);
  }
}

export async function updateBannerRequestInFirestore(
  id: string,
  data: Partial<BannerRequestData>,
): Promise<void> {
  try {
    await updateDoc(doc(db, "banner_requests", id), data);
  } catch (err) {
    console.warn("Firestore updateBannerRequest fallback:", err);
  }
}

// ---------------- Favourites ----------------
export async function getUserFavouritesFromFirestore(userId: string): Promise<FavouriteData[]> {
  if (!userId) return [];
  try {
    const snap = await getDocs(query(collection(db, "favourites"), where("user_id", "==", userId)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FavouriteData);
  } catch {
    return getLocalStorageCache<FavouriteData[]>(`favs_${userId}`, []);
  }
}

export async function addFavouriteInFirestore(userId: string, listingId: string): Promise<void> {
  const id = `${userId}_${listingId}`;
  const fav: FavouriteData = {
    id,
    user_id: userId,
    listing_id: listingId,
    created_at: new Date().toISOString(),
  };
  try {
    await setDoc(doc(db, "favourites", id), fav);
  } catch {
    // fallback
  }
  const favs = getLocalStorageCache<FavouriteData[]>(`favs_${userId}`, []);
  setLocalStorageCache(`favs_${userId}`, [...favs, fav]);
}

export async function removeFavouriteFromFirestore(
  userId: string,
  listingId: string,
): Promise<void> {
  const id = `${userId}_${listingId}`;
  try {
    await deleteDoc(doc(db, "favourites", id));
  } catch {
    // fallback
  }
  const favs = getLocalStorageCache<FavouriteData[]>(`favs_${userId}`, []);
  setLocalStorageCache(
    `favs_${userId}`,
    favs.filter((f) => f.listing_id !== listingId),
  );
}

// ---------------- Reviews ----------------
export async function getReviewsFromFirestore(targetId: string): Promise<ReviewData[]> {
  try {
    const snap = await getDocs(
      query(collection(db, "reviews"), where("seller_id", "==", targetId)),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ReviewData);
  } catch {
    return [];
  }
}

export async function saveReviewToFirestore(review: Partial<ReviewData>): Promise<void> {
  const id = review.id || crypto.randomUUID();
  try {
    await setDoc(
      doc(db, "reviews", id),
      { id, ...review, created_at: new Date().toISOString() },
      { merge: true },
    );
  } catch {
    // fallback
  }
}

// ---------------- Reports ----------------
export async function getReportsFromFirestore(): Promise<ReportData[]> {
  try {
    const snap = await getDocs(collection(db, "reports"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ReportData);
  } catch {
    return [];
  }
}

export async function createReportInFirestore(report: Omit<ReportData, "id">): Promise<void> {
  const id = crypto.randomUUID();
  try {
    await setDoc(doc(db, "reports", id), {
      id,
      ...report,
      status: "pending",
      created_at: new Date().toISOString(),
    });
  } catch {
    // fallback
  }
}

export async function updateReportInFirestore(
  id: string,
  data: Partial<ReportData>,
): Promise<void> {
  try {
    await updateDoc(doc(db, "reports", id), data);
  } catch {
    // fallback
  }
}

// ---------------- Feedback ----------------
export async function getFeedbackFromFirestore(): Promise<FeedbackData[]> {
  try {
    const snap = await getDocs(collection(db, "feedbacks"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FeedbackData);
  } catch {
    return [];
  }
}

export async function createFeedbackInFirestore(data: Omit<FeedbackData, "id">): Promise<void> {
  const id = crypto.randomUUID();
  try {
    await setDoc(doc(db, "feedbacks", id), { id, ...data, created_at: new Date().toISOString() });
  } catch {
    // fallback
  }
}

export async function updateFeedbackInFirestore(
  id: string,
  data: Partial<FeedbackData>,
): Promise<void> {
  try {
    await updateDoc(doc(db, "feedbacks", id), data);
  } catch {
    // fallback
  }
}

// ---------------- Chats ----------------
export async function getUserChatsFromFirestore(userId: string): Promise<ChatData[]> {
  if (!userId) return [];
  try {
    const q1 = query(collection(db, "chats"), where("buyer_id", "==", userId));
    const q2 = query(collection(db, "chats"), where("seller_id", "==", userId));
    const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const map = new Map<string, ChatData>();
    s1.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() } as ChatData));
    s2.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() } as ChatData));
    return Array.from(map.values());
  } catch {
    return getLocalStorageCache<ChatData[]>(`user_chats_${userId}`, []);
  }
}

export async function getChatByIdFromFirestore(chatId: string): Promise<ChatData | null> {
  try {
    const snap = await getDoc(doc(db, "chats", chatId));
    if (snap.exists()) return { id: snap.id, ...snap.data() } as ChatData;
  } catch {
    // fallback
  }
  return null;
}

export async function createOrGetChatInFirestore(
  buyerId: string,
  sellerId: string,
  listingId: string,
): Promise<ChatData> {
  const chatId = `${buyerId}_${sellerId}_${listingId}`;
  try {
    const existing = await getChatByIdFromFirestore(chatId);
    if (existing) return existing;

    const chat: ChatData = {
      id: chatId,
      buyer_id: buyerId,
      seller_id: sellerId,
      listing_id: listingId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await setDoc(doc(db, "chats", chatId), chat);
    return chat;
  } catch {
    const fallbackChat: ChatData = {
      id: chatId,
      buyer_id: buyerId,
      seller_id: sellerId,
      listing_id: listingId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return fallbackChat;
  }
}

export async function getMessagesFromFirestore(chatId: string): Promise<MessageData[]> {
  try {
    const snap = await getDocs(
      query(collection(db, "chats", chatId, "messages"), orderBy("created_at", "asc")),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MessageData);
  } catch {
    return getLocalStorageCache<MessageData[]>(`chat_msgs_${chatId}`, []);
  }
}

export async function updateChatCallSetting(
  chatId: string,
  enabled: boolean,
  enabledBy: string,
): Promise<void> {
  try {
    await updateDoc(doc(db, "chats", chatId), {
      call_enabled: enabled,
      call_enabled_by: enabledBy,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // fallback
  }
}

export async function sendMessageInFirestore(
  chatId: string,
  senderId: string,
  text: string,
): Promise<MessageData> {
  const id = crypto.randomUUID();
  const msg: MessageData = {
    id,
    chat_id: chatId,
    sender_id: senderId,
    text,
    created_at: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, "chats", chatId, "messages", id), msg);
    await updateDoc(doc(db, "chats", chatId), {
      last_message: text,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // fallback
  }

  const existing = getLocalStorageCache<MessageData[]>(`chat_msgs_${chatId}`, []);
  setLocalStorageCache(`chat_msgs_${chatId}`, [...existing, msg]);

  return msg;
}

// ---------------- App Settings ----------------
export async function getAppSettingFromFirestore(key: string): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db, "app_settings", key));
    if (snap.exists()) return snap.data().value || null;
  } catch {
    // fallback
  }
  return null;
}

export async function getAllAppSettingsFromFirestore(): Promise<Record<string, string>> {
  try {
    const snap = await getDocs(collection(db, "app_settings"));
    const res: Record<string, string> = {};
    snap.docs.forEach((d) => {
      res[d.id] = d.data().value;
    });
    return res;
  } catch {
    return {};
  }
}

export async function setAppSettingInFirestore(key: string, value: string): Promise<void> {
  try {
    await setDoc(doc(db, "app_settings", key), { key, value }, { merge: true });
  } catch {
    // fallback
  }
}

// ---------------- Legal Pages ----------------
export async function getLegalPageFromFirestore(slug: string): Promise<LegalPageData | null> {
  try {
    const snap = await getDoc(doc(db, "legal_pages", slug));
    if (snap.exists()) return snap.data() as LegalPageData;
  } catch {
    // fallback
  }
  return null;
}

export async function saveLegalPageInFirestore(
  slug: string,
  title: string,
  content: string,
): Promise<void> {
  try {
    await setDoc(doc(db, "legal_pages", slug), {
      slug,
      title,
      content,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // fallback
  }
}

// ---------------- Business Profiles ----------------
export async function getBusinessProfileFromFirestore(
  userId: string,
): Promise<BusinessProfileData | null> {
  try {
    const snap = await getDoc(doc(db, "business_profiles", userId));
    if (snap.exists()) return snap.data() as BusinessProfileData;
  } catch {
    // fallback
  }
  return null;
}

export async function saveBusinessProfileInFirestore(data: BusinessProfileData): Promise<void> {
  try {
    await setDoc(doc(db, "business_profiles", data.user_id), data, { merge: true });
  } catch {
    // fallback
  }
}

export async function saveBusinessProfileToFirestore(data: any): Promise<void> {
  if (data?.user_id) {
    await saveBusinessProfileInFirestore(data);
  }
}

// ---------------- Verification Requests ----------------
export async function getVerificationRequestsFromFirestore(): Promise<VerificationRequestData[]> {
  try {
    const snap = await getDocs(collection(db, "verification_requests"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as VerificationRequestData);
  } catch {
    return [];
  }
}

export async function createVerificationRequestInFirestore(
  data: Omit<VerificationRequestData, "id">,
): Promise<void> {
  const id = crypto.randomUUID();
  try {
    await setDoc(doc(db, "verification_requests", id), {
      id,
      ...data,
      status: "pending",
      created_at: new Date().toISOString(),
    });
  } catch {
    // fallback
  }
}

export async function updateVerificationRequestInFirestore(
  id: string,
  data: Partial<VerificationRequestData>,
): Promise<void> {
  try {
    await updateDoc(doc(db, "verification_requests", id), data);
  } catch {
    // fallback
  }
}

// ---------------- Transactions ----------------
export async function getTransactionsFromFirestore(): Promise<TransactionData[]> {
  try {
    const snap = await getDocs(collection(db, "transactions"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TransactionData);
  } catch {
    return [];
  }
}

export async function createTransactionInFirestore(
  data: Omit<TransactionData, "id">,
): Promise<void> {
  const id = crypto.randomUUID();
  try {
    await setDoc(doc(db, "transactions", id), {
      id,
      ...data,
      created_at: new Date().toISOString(),
    });
  } catch {
    // fallback
  }
}

// ---------------- User Roles ----------------
export async function getUserRoleFromFirestore(userId: string): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db, "user_roles", userId));
    if (snap.exists()) return snap.data().role || null;
  } catch {
    // fallback
  }
  return null;
}

export async function setUserRoleInFirestore(userId: string, role: string): Promise<void> {
  try {
    await setDoc(
      doc(db, "user_roles", userId),
      { role, updated_at: new Date().toISOString() },
      { merge: true },
    );
  } catch {
    // fallback
  }
}

export async function getAllUserRolesFromFirestore(): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  try {
    const snap = await getDocs(collection(db, "user_roles"));
    snap.docs.forEach((d) => {
      if (d.data()?.role) {
        result[d.id] = d.data().role;
      }
    });
  } catch {
    // fallback
  }
  return result;
}

// ---------------- Appeals ----------------
export async function getAppealsFromFirestore(userId?: string): Promise<AppealData[]> {
  try {
    const qConstraints = [];
    if (userId) qConstraints.push(where("user_id", "==", userId));
    const snap = await getDocs(query(collection(db, "appeals"), ...qConstraints));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppealData);
  } catch {
    return [];
  }
}

export async function createAppealInFirestore(data: Omit<AppealData, "id">): Promise<void> {
  const id = crypto.randomUUID();
  try {
    await setDoc(doc(db, "appeals", id), {
      id,
      ...data,
      status: "pending",
      created_at: new Date().toISOString(),
    });
  } catch {
    // fallback
  }
}

export async function updateAppealInFirestore(
  id: string,
  data: Partial<AppealData>,
): Promise<void> {
  try {
    await updateDoc(doc(db, "appeals", id), data);
  } catch {
    // fallback
  }
}

// ---------------- Subscriptions ----------------
export async function getSubscriptionsFromFirestore(userId?: string): Promise<SubscriptionData[]> {
  try {
    const qConstraints = [];
    if (userId) qConstraints.push(where("user_id", "==", userId));
    const snap = await getDocs(query(collection(db, "subscriptions"), ...qConstraints));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SubscriptionData);
  } catch {
    return [];
  }
}

export async function createSubscriptionInFirestore(
  data: Omit<SubscriptionData, "id">,
): Promise<void> {
  const id = crypto.randomUUID();
  try {
    await setDoc(doc(db, "subscriptions", id), {
      id,
      ...data,
      created_at: new Date().toISOString(),
    });
  } catch {
    // fallback
  }
}

export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlanData[] = [
  {
    id: "plan_free",
    name: "Free Member",
    code: "free",
    price: 0,
    duration_days: 30,
    tier: "free",
    ad_free: false,
    active: true,
    is_active: true,
    benefits: [
      "Up to 3 free active listings",
      "Standard buyer & seller messaging",
      "Standard search visibility",
      "Community support",
    ],
    features: [
      "Up to 3 free active listings",
      "Standard buyer & seller messaging",
      "Standard search visibility",
      "Community support",
    ],
  },
  {
    id: "plan_starter",
    name: "Starter Package",
    code: "starter",
    price: 199,
    duration_days: 30,
    tier: "starter",
    ad_free: false,
    active: true,
    is_active: true,
    benefits: [
      "Up to 10 active listings",
      "1 Featured Listing boost per month",
      "Highlighted listing card outline",
      "Email & WhatsApp chat support",
    ],
    features: [
      "Up to 10 active listings",
      "1 Featured Listing boost per month",
      "Highlighted listing card outline",
      "Email & WhatsApp chat support",
    ],
  },
  {
    id: "plan_pro",
    name: "Professional Tier",
    code: "pro",
    price: 499,
    duration_days: 30,
    tier: "premium",
    ad_free: false,
    active: true,
    is_active: true,
    benefits: [
      "Unlimited active listings",
      "Verified Seller Badge on profile & listings",
      "3 Featured Listing boosts per month",
      "Priority top position in search results",
      "Direct Call & Phone Request feature enabled",
    ],
    features: [
      "Unlimited active listings",
      "Verified Seller Badge on profile & listings",
      "3 Featured Listing boosts per month",
      "Priority top position in search results",
      "Direct Call & Phone Request feature enabled",
    ],
  },
  {
    id: "plan_business",
    name: "Business Enterprise",
    code: "business",
    price: 999,
    duration_days: 30,
    tier: "business",
    ad_free: true,
    active: true,
    is_active: true,
    benefits: [
      "Unlimited active listings",
      "Custom Business Storefront Profile",
      "10 Featured Listing boosts per month",
      "50% Discount on Home Banner Ads",
      "Includes Ad-Free Browsing Experience",
      "Dedicated 24/7 VIP Priority Support",
    ],
    features: [
      "Unlimited active listings",
      "Custom Business Storefront Profile",
      "10 Featured Listing boosts per month",
      "50% Discount on Home Banner Ads",
      "Includes Ad-Free Browsing Experience",
      "Dedicated 24/7 VIP Priority Support",
    ],
  },
  {
    id: "plan_no_ads",
    name: "No Ads Pass",
    code: "no_ads",
    price: 99,
    duration_days: 30,
    tier: "ad_free",
    ad_free: true,
    active: true,
    is_active: true,
    benefits: [
      "100% Ad-Free marketplace browsing",
      "Hides all AdMob banner advertisements",
      "Hides promotional popups & sponsor cards",
      "Faster, cleaner browsing across Lakshadweep Connect",
    ],
    features: [
      "100% Ad-Free marketplace browsing",
      "Hides all AdMob banner advertisements",
      "Hides promotional popups & sponsor cards",
      "Faster, cleaner browsing across Lakshadweep Connect",
    ],
  },
];

export async function getSubscriptionPlansFromFirestore(): Promise<SubscriptionPlanData[]> {
  try {
    const snap = await getDocs(collection(db, "subscription_plans"));
    if (snap.docs.length > 0) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SubscriptionPlanData);
    }
  } catch (err) {
    console.warn("Firestore getSubscriptionPlans fallback:", err);
  }
  return DEFAULT_SUBSCRIPTION_PLANS;
}

export async function getActiveSubscriptionPlansFromFirestore(): Promise<SubscriptionPlanData[]> {
  const plans = await getSubscriptionPlansFromFirestore();
  return plans.filter((p) => p.active !== false && p.is_active !== false);
}

export async function saveSubscriptionPlanInFirestore(
  id: string,
  data: Partial<SubscriptionPlanData>,
): Promise<void> {
  try {
    await setDoc(doc(db, "subscription_plans", id), { id, ...data }, { merge: true });
  } catch (err) {
    console.warn("Firestore saveSubscriptionPlan error:", err);
  }
}

export async function deleteSubscriptionPlanInFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "subscription_plans", id));
  } catch (err) {
    console.warn("Firestore deleteSubscriptionPlan error:", err);
  }
}

export async function cancelSubscriptionInFirestore(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, "subscriptions", id), {
      status: "cancelled",
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Firestore cancelSubscription error:", err);
  }
}

export async function requestCallFromSellerInFirestore(
  chatId: string,
  buyerId: string,
): Promise<void> {
  try {
    await updateDoc(doc(db, "chats", chatId), {
      call_request_status: "pending",
      call_requested_by: buyerId,
      updated_at: new Date().toISOString(),
    });
    await sendMessageInFirestore(chatId, buyerId, "📞 Call & Phone request sent to seller.");
  } catch (err) {
    console.warn("requestCallFromSellerInFirestore error:", err);
  }
}

export async function respondToCallRequestInFirestore(
  chatId: string,
  sellerId: string,
  sellerPhone: string | null,
  accept: boolean,
): Promise<void> {
  try {
    if (accept) {
      await updateDoc(doc(db, "chats", chatId), {
        call_request_status: "accepted",
        seller_phone: sellerPhone,
        call_enabled: true,
        updated_at: new Date().toISOString(),
      });
      await sendMessageInFirestore(
        chatId,
        sellerId,
        `✅ Call request accepted! Seller Phone Number: ${sellerPhone || "Shared"}`,
      );
    } else {
      await updateDoc(doc(db, "chats", chatId), {
        call_request_status: "declined",
        updated_at: new Date().toISOString(),
      });
      await sendMessageInFirestore(chatId, sellerId, "❌ Call request declined by seller.");
    }
  } catch (err) {
    console.warn("respondToCallRequestInFirestore error:", err);
  }
}

// ---------------- Promotional Ads ----------------
export async function getPromotionalAdsFromFirestore(): Promise<PromotionalAdData[]> {
  try {
    const snap = await getDocs(collection(db, "promotional_ads"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PromotionalAdData);
  } catch {
    return [];
  }
}

export async function createPromotionalAdInFirestore(
  data: Omit<PromotionalAdData, "id">,
): Promise<void> {
  const id = crypto.randomUUID();
  try {
    await setDoc(doc(db, "promotional_ads", id), {
      id,
      ...data,
      created_at: new Date().toISOString(),
    });
  } catch {
    // fallback
  }
}

// ---------------- Seed / Sync All Collections ----------------
export async function seedFirestoreCollections(currentUserId?: string): Promise<void> {
  const userId = currentUserId || "system_admin";
  const now = new Date().toISOString();

  // 1. Categories
  for (const cat of DEFAULT_CATEGORIES) {
    await setDoc(doc(db, "categories", cat.id), cat, { merge: true }).catch(() => {});
  }

  // 2. Banners
  for (const b of DEFAULT_BANNERS) {
    await setDoc(doc(db, "banners", b.id), { ...b, created_at: now }, { merge: true }).catch(
      () => {},
    );
  }

  // 3. User Roles
  await setDoc(
    doc(db, "user_roles", userId),
    { role: "admin", updated_at: now },
    { merge: true },
  ).catch(() => {});
  await setDoc(
    doc(db, "user_roles", "system_admin"),
    { role: "admin", updated_at: now },
    { merge: true },
  ).catch(() => {});

  // 4. Profiles
  await setDoc(
    doc(db, "profiles", userId),
    {
      id: userId,
      full_name: "Admin User",
      is_admin: true,
      verified: true,
      updated_at: now,
    },
    { merge: true },
  ).catch(() => {});

  // 5. Listings
  const demoListings = [
    {
      id: "listing_demo_1",
      user_id: userId,
      title: "2022 Toyota Corolla - Excellent Condition",
      description: "Low mileage, well maintained, single owner island car.",
      price: 18500,
      category_slug: "vehicles",
      condition: "used" as const,
      island: "Main Island",
      location: "Capital City",
      contact_number: "+12465550199",
      images: ["https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800"],
      image_url: "https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800",
      status: "approved" as const,
      featured: true,
      views_count: 142,
      created_at: now,
      updated_at: now,
    },
    {
      id: "listing_demo_2",
      user_id: userId,
      title: "Luxury Beachfront Villa 3 Bedrooms",
      description: "Stunning ocean views, private pool, modern finishings.",
      price: 450000,
      category_slug: "real-estate",
      condition: "new" as const,
      island: "Main Island",
      location: "Sunset Coast",
      contact_number: "+12465550199",
      images: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800"],
      image_url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
      status: "approved" as const,
      featured: true,
      views_count: 320,
      created_at: now,
      updated_at: now,
    },
  ];
  for (const l of demoListings) {
    await setDoc(doc(db, "listings", l.id), l, { merge: true }).catch(() => {});
  }

  // 6. App Settings
  const settings = [
    { key: "platform_name", value: "Island Marketplace" },
    { key: "support_email", value: "support@marketplace.com" },
    { key: "commission_rate", value: "5%" },
    { key: "maintenance_mode", value: "false" },
    { key: "allow_new_registrations", value: "true" },
  ];
  for (const s of settings) {
    await setDoc(doc(db, "app_settings", s.key), s, { merge: true }).catch(() => {});
  }

  // 7. Subscription Plans
  const plans = [
    {
      id: "plan_free",
      name: "Free Member",
      code: "free",
      price: 0,
      duration_days: 30,
      features: ["Up to 3 free listings", "Standard support"],
      active: true,
    },
    {
      id: "plan_pro",
      name: "Pro Seller",
      code: "pro",
      price: 29.99,
      duration_days: 30,
      features: ["Unlimited listings", "Featured badge", "Priority search ranking"],
      active: true,
    },
  ];
  for (const p of plans) {
    await setDoc(doc(db, "subscription_plans", p.id), p, { merge: true }).catch(() => {});
  }

  // 8. Legal Pages
  const legal = [
    {
      slug: "terms",
      title: "Terms of Service",
      content: "Welcome to Island Marketplace. By using our services you agree to...",
      updated_at: now,
    },
    {
      slug: "privacy",
      title: "Privacy Policy",
      content: "We value your privacy. Your personal information is protected...",
      updated_at: now,
    },
  ];
  for (const item of legal) {
    await setDoc(doc(db, "legal_pages", item.slug), item, { merge: true }).catch(() => {});
  }

  // 9. Banner Requests
  await setDoc(
    doc(db, "banner_requests", "demo_req_1"),
    {
      id: "demo_req_1",
      user_id: userId,
      business_name: "Island Auto Dealership",
      banner_url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800",
      placement: "home",
      duration_days: 30,
      status: "approved",
      payment_status: "paid",
      created_at: now,
    },
    { merge: true },
  ).catch(() => {});

  // 10. Favourites
  await setDoc(
    doc(db, "favourites", "fav_demo_1"),
    {
      id: "fav_demo_1",
      user_id: userId,
      listing_id: "listing_demo_1",
      created_at: now,
    },
    { merge: true },
  ).catch(() => {});

  // 11. Reviews
  await setDoc(
    doc(db, "reviews", "rev_demo_1"),
    {
      id: "rev_demo_1",
      listing_id: "listing_demo_1",
      reviewer_id: "user_demo_2",
      seller_id: userId,
      rating: 5,
      comment: "Great seller, item was exactly as described!",
      created_at: now,
    },
    { merge: true },
  ).catch(() => {});

  // 12. Reports
  await setDoc(
    doc(db, "reports", "rep_demo_1"),
    {
      id: "rep_demo_1",
      reporter_id: "user_demo_2",
      target_id: "listing_demo_1",
      target_type: "listing",
      reason: "Inappropriate imagery",
      status: "dismissed",
      created_at: now,
    },
    { merge: true },
  ).catch(() => {});

  // 13. Feedbacks
  await setDoc(
    doc(db, "feedbacks", "fb_demo_1"),
    {
      id: "fb_demo_1",
      user_id: userId,
      email: "user@example.com",
      subject: "Great app!",
      message: "The platform is super easy to use.",
      rating: 5,
      created_at: now,
    },
    { merge: true },
  ).catch(() => {});

  // 14. Chats & Messages
  await setDoc(
    doc(db, "chats", "chat_demo_1"),
    {
      id: "chat_demo_1",
      buyer_id: "user_demo_2",
      seller_id: userId,
      listing_id: "listing_demo_1",
      last_message: "Is this still available?",
      created_at: now,
      updated_at: now,
    },
    { merge: true },
  ).catch(() => {});
  await setDoc(
    doc(db, "chats/chat_demo_1/messages", "msg_demo_1"),
    {
      id: "msg_demo_1",
      chat_id: "chat_demo_1",
      sender_id: "user_demo_2",
      text: "Is this still available?",
      created_at: now,
    },
    { merge: true },
  ).catch(() => {});

  // 15. Business Profiles
  await setDoc(
    doc(db, "business_profiles", userId),
    {
      user_id: userId,
      business_name: "Premier Island Motors",
      phone: "+12465550199",
      email: "contact@islandmotors.com",
      address: "123 Harbour View Road",
      verified: true,
    },
    { merge: true },
  ).catch(() => {});

  // 16. Verification Requests
  await setDoc(
    doc(db, "verification_requests", "vr_demo_1"),
    {
      id: "vr_demo_1",
      user_id: userId,
      document_type: "National ID / Passport",
      document_url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800",
      status: "approved",
      created_at: now,
    },
    { merge: true },
  ).catch(() => {});

  // 17. Transactions
  await setDoc(
    doc(db, "transactions", "tx_demo_1"),
    {
      id: "tx_demo_1",
      user_id: userId,
      amount: 29.99,
      type: "subscription_pro",
      status: "completed",
      created_at: now,
    },
    { merge: true },
  ).catch(() => {});

  // 18. Appeals
  await setDoc(
    doc(db, "appeals", "app_demo_1"),
    {
      id: "app_demo_1",
      user_id: userId,
      reason: "Requesting account unban appeal review.",
      status: "approved",
      created_at: now,
    },
    { merge: true },
  ).catch(() => {});

  // 19. Subscriptions
  await setDoc(
    doc(db, "subscriptions", "sub_demo_1"),
    {
      id: "sub_demo_1",
      user_id: userId,
      plan_id: "plan_pro",
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      created_at: now,
    },
    { merge: true },
  ).catch(() => {});

  // 20. Promotional Ads
  await setDoc(
    doc(db, "promotional_ads", "ad_demo_1"),
    {
      id: "ad_demo_1",
      user_id: userId,
      title: "Special Summer Discount",
      image_url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
      active: true,
      created_at: now,
    },
    { merge: true },
  ).catch(() => {});
}

// ── Notifications ──────────────────────────────────────────────────

export async function getNotificationsFromFirestore(userId: string): Promise<NotificationData[]> {
  try {
    const q = query(
      collection(db, "notifications"),
      where("user_id", "==", userId),
      orderBy("created_at", "desc"),
      limit(50),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as NotificationData[];
  } catch {
    return [];
  }
}

export async function createNotificationInFirestore(
  data: Omit<NotificationData, "id" | "created_at">,
): Promise<string> {
  try {
    const ref = await addDoc(collection(db, "notifications"), {
      ...data,
      read: false,
      created_at: new Date().toISOString(),
    });
    return ref.id;
  } catch {
    return "";
  }
}

export async function markNotificationReadInFirestore(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, "notifications", id), { read: true });
  } catch {
    // fallback
  }
}

export async function markAllNotificationsReadInFirestore(userId: string): Promise<void> {
  try {
    const q = query(
      collection(db, "notifications"),
      where("user_id", "==", userId),
      where("read", "==", false),
    );
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { read: true })));
  } catch {
    // fallback
  }
}

export function subscribeToNotifications(
  userId: string,
  cb: (notifications: NotificationData[]) => void,
): () => void {
  try {
    const q = query(
      collection(db, "notifications"),
      where("user_id", "==", userId),
      orderBy("created_at", "desc"),
      limit(50),
    );
    const unsub = onSnapshot(q, (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as NotificationData[]);
    });
    return unsub;
  } catch {
    return () => {};
  }
}

// ── Messages realtime ──────────────────────────────────────────────

export function subscribeToMessages(
  chatId: string,
  cb: (messages: MessageData[]) => void,
): () => void {
  try {
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("created_at", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as MessageData[]);
    });
    return unsub;
  } catch {
    return () => {};
  }
}

// ── Banner CRUD additions ──────────────────────────────────────────

export async function updateBannerInFirestore(
  id: string,
  patch: Partial<BannerData>,
): Promise<void> {
  try {
    await updateDoc(doc(db, "banners", id), {
      ...patch,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // fallback
  }
}

export async function toggleBannerInFirestore(id: string, active: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, "banners", id), { active });
  } catch {
    // fallback
  }
}

// ── Banner request publish ──────────────────────────────────────────

export async function publishBannerRequestInFirestore(
  id: string,
): Promise<{ banner: BannerData; request: BannerRequestData }> {
  const reqDoc = await getDoc(doc(db, "banner_requests", id));
  if (!reqDoc.exists()) throw new Error("Request not found");
  const req = { id: reqDoc.id, ...reqDoc.data() } as BannerRequestData;

  const start = new Date();
  const end = new Date(start.getTime() + Number(req.duration_days ?? 7) * 86400000);
  const bannerId = `banner_${id}`;
  const banner: BannerData = {
    id: bannerId,
    title: req.title || req.business_name || "",
    subtitle: req.description ?? "",
    image_url: req.image_url || req.banner_url || "",
    link_url: req.link_url || req.target_url || null,
    placement: "home",
    banner_type: "promotional",
    position: 100,
    active: true,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    view_count: 0,
    click_count: 0,
    created_at: start.toISOString(),
  };

  await setDoc(doc(db, "banners", bannerId), banner).catch(() => {});
  await updateDoc(doc(db, "banner_requests", id), {
    status: "live",
    scheduled_start: start.toISOString(),
    scheduled_end: end.toISOString(),
    updated_at: new Date().toISOString(),
  }).catch(() => {});

  return { banner, request: req };
}

// ── Subscription helpers ────────────────────────────────────────────

export async function getActiveSubscriptionByUserFromFirestore(
  userId: string,
): Promise<SubscriptionData | null> {
  try {
    const q = query(
      collection(db, "subscriptions"),
      where("user_id", "==", userId),
      where("status", "==", "active"),
      orderBy("expiry_date", "desc"),
      limit(1),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as SubscriptionData;
  } catch {
    return null;
  }
}

export async function updateSubscriptionInFirestore(
  id: string,
  patch: Partial<SubscriptionData>,
): Promise<void> {
  try {
    await updateDoc(doc(db, "subscriptions", id), patch as any);
  } catch {
    // fallback
  }
}

export async function getSubscriptionPlanByCodeFromFirestore(
  code: string,
): Promise<SubscriptionPlanData | null> {
  try {
    const all = await getSubscriptionPlansFromFirestore();
    return all.find((p) => p.code === code) ?? null;
  } catch {
    return null;
  }
}

// ── Transaction helpers ────────────────────────────────────────────

export async function getTransactionsByUserFromFirestore(
  userId: string,
): Promise<TransactionData[]> {
  try {
    const q = query(
      collection(db, "transactions"),
      where("user_id", "==", userId),
      orderBy("created_at", "desc"),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as TransactionData[];
  } catch {
    return [];
  }
}

// ── Verification helpers ────────────────────────────────────────────

export async function getVerificationRequestByUserFromFirestore(
  userId: string,
): Promise<VerificationRequestData | null> {
  try {
    const q = query(
      collection(db, "verification_requests"),
      where("user_id", "==", userId),
      orderBy("created_at", "desc"),
      limit(1),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as VerificationRequestData;
  } catch {
    return null;
  }
}

// ── Legal pages helpers ──────────────────────────────────────────────

export async function getAllLegalPagesFromFirestore(): Promise<LegalPageData[]> {
  try {
    const snap = await getDocs(collection(db, "legal_pages"));
    return snap.docs.map((d) => ({ slug: d.id, ...d.data() })) as LegalPageData[];
  } catch {
    return [];
  }
}

// ── Promotional Ad CRUD additions ────────────────────────────────────

export async function updatePromotionalAdInFirestore(
  id: string,
  patch: Partial<PromotionalAdData>,
): Promise<void> {
  try {
    await updateDoc(doc(db, "promotional_ads", id), patch as any);
  } catch {
    // fallback
  }
}

export async function deletePromotionalAdFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "promotional_ads", id));
  } catch {
    // fallback
  }
}

// ── Profile helpers ──────────────────────────────────────────────────

export async function updateProfileInFirestore(
  id: string,
  patch: Record<string, any>,
): Promise<void> {
  try {
    await updateDoc(doc(db, "profiles", id), patch);
  } catch {
    // fallback
  }
}
