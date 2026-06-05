import { ArrowLeft, Settings, Book as BookIcon, Users, Eye, Bell, BellOff, Share2 } from "lucide-react";
import { C, inter, GRADIENT_PRIMARY } from "../theme";
import { AppBookCard, BookData } from "./AppBookCard";

interface Props {
  sw: number;
  subscribed?: boolean;
  scrollY?: number;
  books?: BookData[];
}

const Stat = ({ sw, Icon, value, label }: any) => (
  <div style={{ background: C.card, borderRadius: sw * 0.03, border: `1px solid ${C.border}`, padding: `${sw * 0.035}px 0`, textAlign: "center" }}>
    <Icon size={sw * 0.05} color={C.primary} style={{ marginBottom: sw * 0.015 }} />
    <div style={{ fontFamily: inter, fontWeight: 800, fontSize: sw * 0.055, color: C.foreground }}>{value}</div>
    <div style={{ fontFamily: inter, fontSize: sw * 0.032, color: C.mutedFg }}>{label}</div>
  </div>
);

export const ChannelScreen = ({ sw, subscribed = false, scrollY = 0, books = [] }: Props) => {
  const pad = sw * 0.045;
  const gap = sw * 0.025;
  const cols = 3;
  const cardW = (sw - pad * 2 - gap * (cols - 1)) / cols;

  return (
    <div style={{ width: "100%", height: "100%", background: C.appBg, position: "relative", overflow: "hidden" }}>
      {/* header */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 40, background: "rgba(255,255,255,0.92)", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: sw * 0.03, padding: `${sw * 0.035}px ${pad}px` }}>
        <ArrowLeft size={sw * 0.055} color={C.foreground} />
        <span style={{ flex: 1, fontFamily: inter, fontWeight: 700, fontSize: sw * 0.048, color: C.foreground }}>GrowthLab</span>
        <Settings size={sw * 0.05} color={C.mutedFg} />
      </div>

      <div style={{ position: "absolute", top: 0, left: 0, right: 0, transform: `translateY(${-scrollY}px)`, paddingTop: sw * 0.14 }}>
        {/* banner */}
        <div style={{ height: sw * 0.36, background: GRADIENT_PRIMARY, position: "relative" }} />

        <div style={{ padding: `0 ${pad}px` }}>
          {/* avatar + info */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: sw * 0.04, marginTop: -sw * 0.1, marginBottom: sw * 0.04 }}>
            <div style={{ width: sw * 0.24, height: sw * 0.24, borderRadius: "50%", background: "linear-gradient(135deg,#2563EB,#5B8DEF)", border: `4px solid ${C.appBg}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: inter, fontWeight: 800, fontSize: sw * 0.09, flexShrink: 0, boxShadow: "0 8px 20px rgba(0,0,0,0.15)" }}>G</div>
            <div style={{ flex: 1, paddingBottom: sw * 0.01 }}>
              <div style={{ display: "flex", alignItems: "center", gap: sw * 0.02 }}>
                <span style={{ fontFamily: inter, fontWeight: 800, fontSize: sw * 0.058, color: C.foreground }}>GrowthLab</span>
                <span style={{ fontFamily: inter, fontWeight: 600, fontSize: sw * 0.032, padding: `${sw * 0.01}px ${sw * 0.025}px`, borderRadius: sw * 0.015, background: C.muted, color: C.foreground }}>Author</span>
              </div>
              <div style={{ fontFamily: inter, fontSize: sw * 0.036, color: C.mutedFg, marginTop: sw * 0.01 }}>18.2K subscribers • 24 books</div>
            </div>
          </div>

          <div style={{ fontFamily: inter, fontSize: sw * 0.038, color: C.mutedFg, lineHeight: 1.5, marginBottom: sw * 0.04 }}>
            Practical books on business, growth & focus. New releases every month.
          </div>

          {/* subscribe + share */}
          <div style={{ display: "flex", gap: sw * 0.03, marginBottom: sw * 0.05 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: sw * 0.02, height: sw * 0.11, borderRadius: sw * 0.022, background: subscribed ? "transparent" : C.primary, border: subscribed ? `1px solid ${C.border}` : "none", color: subscribed ? C.foreground : "#fff", fontFamily: inter, fontWeight: 700, fontSize: sw * 0.042 }}>
              {subscribed ? <><BellOff size={sw * 0.045} /> Unsubscribe</> : <><Bell size={sw * 0.045} /> Subscribe</>}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: sw * 0.02, height: sw * 0.11, padding: `0 ${sw * 0.04}px`, borderRadius: sw * 0.022, border: `1px solid ${C.border}`, background: C.card, color: C.foreground, fontFamily: inter, fontWeight: 600, fontSize: sw * 0.04 }}>
              <Share2 size={sw * 0.045} /> Share
            </div>
          </div>

          {/* stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: sw * 0.025, marginBottom: sw * 0.05 }}>
            <Stat sw={sw} Icon={BookIcon} value="24" label="Books" />
            <Stat sw={sw} Icon={Users} value="18.2K" label="Subscribers" />
            <Stat sw={sw} Icon={Eye} value="412K" label="Total Views" />
            <Stat sw={sw} Icon={BookIcon} value="38K" label="Downloads" />
          </div>

          {/* books grid */}
          <div style={{ fontFamily: inter, fontWeight: 700, fontSize: sw * 0.045, color: C.foreground, marginBottom: sw * 0.035 }}>All Books (24)</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${cardW}px)`, gap, justifyContent: "space-between" }}>
            {books.map((b, i) => (
              <AppBookCard key={i} book={b} w={cardW} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
