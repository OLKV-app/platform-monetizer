// Inhabited islands of Lakshadweep
export const ISLANDS = [
  "Kavaratti",
  "Agatti",
  "Amini",
  "Andrott",
  "Kadmat",
  "Kalpeni",
  "Kiltan",
  "Chetlat",
  "Bitra",
  "Bangaram",
  "Minicoy",
] as const;

export type Island = (typeof ISLANDS)[number];
