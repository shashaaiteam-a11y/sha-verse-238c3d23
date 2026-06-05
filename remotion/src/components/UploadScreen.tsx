import { Image as ImageIcon, FileText, ChevronsUpDown, X } from "lucide-react";
import { C, inter } from "../theme";
import { BookCoverArt, BookData } from "./AppBookCard";

interface Props {
  sw: number;
  cover?: BookData | null;
  fileName?: string | null;
  title?: string;
  author?: string;
  category?: string;
  language?: string;
  pages?: string;
  showTitleCaret?: boolean;
  uploading?: boolean;
}

const Field = ({ sw, label, value, placeholder, caret }: any) => (
  <div style={{ marginBottom: sw * 0.03 }}>
    <div style={{ fontFamily: inter, fontWeight: 600, fontSize: sw * 0.036, color: C.foreground, marginBottom: sw * 0.015 }}>{label}</div>
    <div style={{ display: "flex", alignItems: "center", height: sw * 0.1, borderRadius: sw * 0.02, border: `1px solid ${C.border}`, background: C.card, padding: `0 ${sw * 0.03}px`, fontFamily: inter, fontSize: sw * 0.04, color: value ? C.foreground : C.mutedFg }}>
      {value || placeholder}
      {caret && <span style={{ width: 2, height: sw * 0.05, background: C.primary, marginLeft: 1 }} />}
    </div>
  </div>
);

const Combo = ({ sw, label, value }: any) => (
  <div style={{ marginBottom: sw * 0.03 }}>
    <div style={{ fontFamily: inter, fontWeight: 600, fontSize: sw * 0.036, color: C.foreground, marginBottom: sw * 0.015 }}>{label}</div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: sw * 0.1, borderRadius: sw * 0.02, border: `1px solid ${C.border}`, background: C.card, padding: `0 ${sw * 0.03}px`, fontFamily: inter, fontSize: sw * 0.04, color: C.foreground }}>
      {value}
      <ChevronsUpDown size={sw * 0.04} color={C.mutedFg} />
    </div>
  </div>
);

export const UploadScreen = ({
  sw,
  cover = null,
  fileName = null,
  title = "",
  author = "",
  category = "Fiction",
  language = "English",
  pages = "",
  showTitleCaret = false,
  uploading = false,
}: Props) => {
  const dlgW = sw * 0.92;
  return (
    <div style={{ width: "100%", height: "100%", background: "rgba(10,12,24,0.55)", position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
      <div
        style={{
          width: dlgW,
          marginTop: sw * 0.06,
          maxHeight: "94%",
          overflow: "hidden",
          background: C.card,
          borderRadius: sw * 0.04,
          boxShadow: "0 30px 80px rgba(0,0,0,0.4)",
          padding: sw * 0.05,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: sw * 0.04 }}>
          <span style={{ fontFamily: inter, fontWeight: 800, fontSize: sw * 0.058, color: C.foreground }}>Upload Book</span>
          <X size={sw * 0.05} color={C.mutedFg} />
        </div>

        {/* cover */}
        <div style={{ fontFamily: inter, fontWeight: 600, fontSize: sw * 0.036, color: C.foreground, marginBottom: sw * 0.015 }}>Cover Image</div>
        <div
          style={{
            width: sw * 0.26,
            height: sw * 0.26 * 1.5,
            margin: "0 auto",
            borderRadius: sw * 0.022,
            border: cover ? "none" : `2px dashed ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            fontSize: sw * 0.05,
            marginBottom: sw * 0.035,
          }}
        >
          {cover ? (
            <BookCoverArt book={cover} radius={0} />
          ) : (
            <div style={{ textAlign: "center", color: C.mutedFg }}>
              <ImageIcon size={sw * 0.06} />
              <div style={{ fontFamily: inter, fontSize: sw * 0.03, marginTop: sw * 0.015 }}>Click to upload cover</div>
            </div>
          )}
        </div>

        {/* book file */}
        <div style={{ fontFamily: inter, fontWeight: 600, fontSize: sw * 0.036, color: C.foreground, marginBottom: sw * 0.015 }}>Book File (PDF, EPUB)</div>
        <div style={{ display: "flex", alignItems: "center", gap: sw * 0.025, borderRadius: sw * 0.02, border: `2px dashed ${C.border}`, background: C.card, padding: sw * 0.03, marginBottom: sw * 0.03 }}>
          <FileText size={sw * 0.055} color={fileName ? C.primary : C.mutedFg} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: inter, fontWeight: fileName ? 600 : 400, fontSize: sw * 0.038, color: fileName ? C.foreground : C.mutedFg, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {fileName || "Click to upload book file"}
            </div>
            {fileName && <div style={{ fontFamily: inter, fontSize: sw * 0.03, color: C.mutedFg }}>3.42 MB</div>}
          </div>
        </div>

        <Field sw={sw} label="Title *" value={title} placeholder="Enter book title" caret={showTitleCaret} />
        <Field sw={sw} label="Author *" value={author} placeholder="Enter author name" />
        <Combo sw={sw} label="Category *" value={category} />
        <Combo sw={sw} label="Language *" value={language} />

        {/* actions */}
        <div style={{ display: "flex", gap: sw * 0.025, marginTop: sw * 0.02 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", height: sw * 0.11, borderRadius: sw * 0.022, border: `1px solid ${C.border}`, color: C.foreground, fontFamily: inter, fontWeight: 600, fontSize: sw * 0.042 }}>Cancel</div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", height: sw * 0.11, borderRadius: sw * 0.022, background: C.primary, color: "#fff", fontFamily: inter, fontWeight: 700, fontSize: sw * 0.042 }}>
            {uploading ? "Uploading..." : "Upload Book"}
          </div>
        </div>
      </div>
    </div>
  );
};
