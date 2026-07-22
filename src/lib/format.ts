export function formatINR(n: number | string): string {
  const num = typeof n === "string" ? Number(n) : n;
  if (!isFinite(num)) return "₹ —";
  return "₹ " + new Intl.NumberFormat("en-IN").format(num);
}

export function timeAgo(iso: string): string {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}
