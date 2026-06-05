import { Home, Video, MessageSquare, BookOpen, Users, User } from "lucide-react";
import { C, inter } from "../theme";

const ITEMS = [
  { Icon: Home, label: "Home", active: false },
  { Icon: Video, label: "Movion", active: false },
  { Icon: MessageSquare, label: "Nova", active: false },
  { Icon: BookOpen, label: "Books", active: true },
  { Icon: Users, label: "Groups", active: false },
  { Icon: User, label: "Profile", active: false },
];

// Faithful recreation of the app's mobile bottom navigation (BottomNav.tsx).
export const BottomNav = ({ w = 880 }: { w?: number }) => {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: w * 0.135,
        background: C.card,
        borderTop: `1px solid ${C.border}`,
        boxShadow: "0 -6px 20px rgba(0,0,0,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        paddingBottom: w * 0.02,
        zIndex: 50,
      }}
    >
      {ITEMS.map(({ Icon, label, active }) => (
        <div
          key={label}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: w * 0.008,
            color: active ? C.primary : C.mutedFg,
          }}
        >
          <Icon size={w * 0.05} strokeWidth={active ? 2.6 : 2} />
          <span style={{ fontFamily: inter, fontWeight: active ? 700 : 500, fontSize: w * 0.026 }}>{label}</span>
        </div>
      ))}
    </div>
  );
};
