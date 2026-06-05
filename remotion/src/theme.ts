import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

export const playfair = loadPlayfair("normal", {
  weights: ["500", "600", "700", "800", "900"],
  subsets: ["latin"],
}).fontFamily;

export const inter = loadInter("normal", {
  weights: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
}).fontFamily;

// Sha-Verse brand palette (from index.css design tokens)
export const C = {
  ink: "#0A1230", // deep blue-black background
  ink2: "#10204A",
  blue: "#2563EB", // primary
  blueGlow: "#5B8DEF",
  orange: "#FF5A1F", // accent
  orangeGlow: "#FF8A3D",
  cream: "#F5EFE3", // paper
  paperInk: "#2A2118",
  white: "#FFFFFF",
  mute: "#9DB0D6",
};

// Procedural book covers used across the video.
export const BOOKS = [
  { title: "The Silent Echo", author: "A. Rahman", g: ["#6D28D9", "#A78BFA"] },
  { title: "Atomic Focus", author: "S. Mehta", g: ["#F59E0B", "#EF4444"] },
  { title: "Code & Coffee", author: "DevPrep", g: ["#0EA5E9", "#06B6D4"] },
  { title: "The Calm Mind", author: "MindEase", g: ["#10B981", "#14B8A6"] },
  { title: "Midnight Verses", author: "R. Kapoor", g: ["#1E293B", "#475569"] },
  { title: "Startup Sprint", author: "GrowthLab", g: ["#2563EB", "#5B8DEF"] },
  { title: "Lost Galaxies", author: "N. Verma", g: ["#7C3AED", "#EC4899"] },
  { title: "Recipe of Joy", author: "Home Kitchen", g: ["#F97316", "#FB923C"] },
  { title: "History Unfolds", author: "P. Singh", g: ["#B45309", "#D97706"] },
  { title: "Quantum Leap", author: "Dr. Iyer", g: ["#0F766E", "#22D3EE"] },
  { title: "Brave Hearts", author: "M. Khan", g: ["#BE123C", "#FB7185"] },
  { title: "The Art Within", author: "Studio 9", g: ["#9333EA", "#C084FC"] },
];

export const CATEGORIES = [
  "Fiction",
  "Self-Help",
  "Education",
  "Comic",
  "Biography",
  "Science",
  "Business",
  "Poetry",
  "Health",
  "Technology",
];
