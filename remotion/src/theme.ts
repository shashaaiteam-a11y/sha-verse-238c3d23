import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";

export const inter = loadInter("normal", {
  weights: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
}).fontFamily;

export const playfair = loadPlayfair("normal", {
  weights: ["600", "700", "800", "900"],
  subsets: ["latin"],
}).fontFamily;

// ─────────────────────────────────────────────────────────────
// EXACT Sha-Verse design tokens (from src/index.css, converted from HSL)
// ─────────────────────────────────────────────────────────────
export const C = {
  // brand
  primary: "#2563EB", // hsl(221 83% 53%)
  primaryGlow: "#5B8DEF", // hsl(221 83% 65%)
  accent: "#FF5A1F", // hsl(14 100% 57%)
  accentGlow: "#FF8A3D", // hsl(14 100% 70%)

  // light app surfaces
  appBg: "#F0F2F7", // hsl(220 30% 96%)
  appBgGrad2: "#E6E9F2", // gradient-subtle end
  card: "#FFFFFF",
  foreground: "#17171C", // hsl(240 10% 10%)
  muted: "#F2F2F4", // hsl(240 5% 96%)
  mutedFg: "#737380", // hsl(240 4% 46%)
  border: "#E3E3E8", // hsl(240 6% 90%)
  destructive: "#EF4444",

  // dark reader
  ink: "#0A1230",
  white: "#FFFFFF",
};

export const GRADIENT_PRIMARY = `linear-gradient(135deg, ${C.primary}, ${C.primaryGlow})`;
export const GRADIENT_SUBTLE = `linear-gradient(180deg, ${C.appBg}, ${C.appBgGrad2})`;

// Brand promo background for intro / outro / captions
export const PROMO_BG = `linear-gradient(160deg, #0B1741 0%, #122B6B 55%, #1E3FA0 100%)`;

// Real categories from src/lib/constants/bookshelf.ts
export const CATEGORIES = [
  "All",
  "Fiction",
  "Self-Help",
  "Education",
  "Comic",
  "Biography",
  "Science",
  "Motivational",
  "Business",
  "Health",
  "Travel",
  "Cooking",
  "Poetry",
];

// Fake-but-realistic book content (procedural covers like the app's gradient covers)
export const BOOKS = [
  { title: "The Silent Echo", author: "A. Rahman", g: ["#6D28D9", "#A78BFA"], cat: "Fiction", views: "12.4K", likes: "1.2K", pages: 284 },
  { title: "Atomic Focus", author: "S. Mehta", g: ["#F59E0B", "#EF4444"], cat: "Self-Help", views: "48.1K", likes: "6.8K", pages: 230 },
  { title: "Code & Coffee", author: "DevPrep", g: ["#0EA5E9", "#06B6D4"], cat: "Technology", views: "9.7K", likes: "880", pages: 176 },
  { title: "The Calm Mind", author: "MindEase", g: ["#10B981", "#14B8A6"], cat: "Health", views: "21.3K", likes: "3.1K", pages: 198 },
  { title: "Midnight Verses", author: "R. Kapoor", g: ["#1E293B", "#475569"], cat: "Poetry", views: "5.2K", likes: "640", pages: 120 },
  { title: "Startup Sprint", author: "GrowthLab", g: ["#2563EB", "#5B8DEF"], cat: "Business", views: "33.9K", likes: "4.4K", pages: 256 },
  { title: "Lost Galaxies", author: "N. Verma", g: ["#7C3AED", "#EC4899"], cat: "Fiction", views: "18.6K", likes: "2.0K", pages: 312 },
  { title: "Recipe of Joy", author: "Home Kitchen", g: ["#F97316", "#FB923C"], cat: "Cooking", views: "14.1K", likes: "1.7K", pages: 144 },
  { title: "History Unfolds", author: "P. Singh", g: ["#B45309", "#D97706"], cat: "Biography", views: "7.8K", likes: "910", pages: 268 },
  { title: "Quantum Leap", author: "Dr. Iyer", g: ["#0F766E", "#22D3EE"], cat: "Science", views: "11.2K", likes: "1.3K", pages: 204 },
  { title: "Brave Hearts", author: "M. Khan", g: ["#BE123C", "#FB7185"], cat: "Fiction", views: "26.5K", likes: "3.6K", pages: 240 },
  { title: "The Art Within", author: "Studio 9", g: ["#9333EA", "#C084FC"], cat: "Art", views: "6.4K", likes: "720", pages: 160 },
];
