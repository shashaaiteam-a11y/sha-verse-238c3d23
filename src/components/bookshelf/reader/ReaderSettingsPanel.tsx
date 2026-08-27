import { Minus, Plus, RotateCcw, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  READER_FONT_STACKS,
  READER_THEMES,
  type ReaderFont,
  type ReaderSettings,
  type ReaderTheme,
  type ReadingMode,
} from "@/lib/reader/settings";

interface Props {
  settings: ReaderSettings;
  onChange: <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => void;
  onReset: () => void;
}

const THEME_ORDER: ReaderTheme[] = ["light", "sepia", "dark", "black"];
const FONT_LABELS: Record<ReaderFont, string> = {
  serif: "Serif",
  sans: "Sans",
  dyslexic: "Easy",
};

const READING_MODES: { value: ReadingMode; label: string }[] = [
  { value: "paged", label: "Paged" },
  { value: "scroll", label: "Scrolling" },
];

const ReaderSettingsPanel = ({ settings, onChange, onReset }: Props) => (
  <div className="space-y-6 py-4">
    <div>
      <p className="mb-3 text-sm font-medium">Reading mode</p>
      <div className="grid grid-cols-2 gap-2">
        {READING_MODES.map((mode) => (
          <Button
            key={mode.value}
            variant={settings.readingMode === mode.value ? "default" : "outline"}
            onClick={() => onChange("readingMode", mode.value)}
            aria-pressed={settings.readingMode === mode.value}
          >
            {mode.label}
          </Button>
        ))}
      </div>
    </div>

    {settings.readingMode === "paged" && (
      <div className="flex items-center justify-between">
        <label htmlFor="reader-page-animation" className="text-sm font-medium">
          Page turn animation
        </label>
        <Switch
          id="reader-page-animation"
          checked={settings.pageAnimation}
          onCheckedChange={(checked) => onChange("pageAnimation", checked)}
        />
      </div>
    )}

    <div>
      <p className="mb-3 text-sm font-medium">Theme</p>
      <div className="grid grid-cols-4 gap-2">
        {THEME_ORDER.map((theme) => {
          const preset = READER_THEMES[theme];
          const active = settings.theme === theme;
          return (
            <button
              key={theme}
              type="button"
              onClick={() => onChange("theme", theme)}
              className={cn(
                "flex h-14 flex-col items-center justify-center rounded-lg border-2 text-xs font-medium transition-colors",
                active ? "border-primary" : "border-border"
              )}
              style={{ backgroundColor: preset.bg, color: preset.text }}
              aria-pressed={active}
            >
              <span style={{ fontSize: 15, fontWeight: 700 }}>Aa</span>
              <span className="mt-0.5 text-[10px] opacity-80">{preset.label}</span>
            </button>
          );
        })}
      </div>
    </div>

    <div>
      <p className="mb-3 text-sm font-medium">Typeface</p>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(FONT_LABELS) as ReaderFont[]).map((font) => (
          <Button
            key={font}
            variant={settings.font === font ? "default" : "outline"}
            onClick={() => onChange("font", font)}
            style={{ fontFamily: READER_FONT_STACKS[font] }}
          >
            {FONT_LABELS[font]}
          </Button>
        ))}
      </div>
    </div>

    <div>
      <p className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Type className="h-4 w-4" /> Text size · {settings.fontSize}px
      </p>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          aria-label="Decrease text size"
          onClick={() => onChange("fontSize", Math.max(settings.fontSize - 1, 14))}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Slider
          value={[settings.fontSize]}
          onValueChange={([value]) => onChange("fontSize", value)}
          min={14}
          max={32}
          step={1}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="icon"
          aria-label="Increase text size"
          onClick={() => onChange("fontSize", Math.min(settings.fontSize + 1, 32))}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>

    <div>
      <p className="mb-3 text-sm font-medium">Line spacing · {settings.lineHeight.toFixed(2)}</p>
      <Slider
        value={[settings.lineHeight * 100]}
        onValueChange={([value]) => onChange("lineHeight", value / 100)}
        min={130}
        max={215}
        step={5}
      />
    </div>

    <div>
      <p className="mb-3 text-sm font-medium">Margins</p>
      <Slider
        value={[settings.margin]}
        onValueChange={([value]) => onChange("margin", value)}
        min={0}
        max={3}
        step={1}
      />
    </div>

    <div>
      <p className="mb-3 text-sm font-medium">
        Paragraph spacing · {settings.paragraphSpacing.toFixed(1)}
      </p>
      <Slider
        value={[settings.paragraphSpacing * 10]}
        onValueChange={([value]) => onChange("paragraphSpacing", value / 10)}
        min={2}
        max={18}
        step={1}
      />
    </div>

    <Separator />

    <div className="flex items-center justify-between">
      <label htmlFor="reader-justify" className="text-sm font-medium">
        Justified text
      </label>
      <Switch
        id="reader-justify"
        checked={settings.justify}
        onCheckedChange={(checked) => onChange("justify", checked)}
      />
    </div>

    <div className="flex items-center justify-between">
      <label htmlFor="reader-spacing" className="text-sm font-medium">
        Extra letter spacing
      </label>
      <Switch
        id="reader-spacing"
        checked={settings.looseSpacing}
        onCheckedChange={(checked) => onChange("looseSpacing", checked)}
      />
    </div>

    <Button variant="ghost" className="w-full" onClick={onReset}>
      <RotateCcw className="mr-2 h-4 w-4" /> Reset to defaults
    </Button>
  </div>
);

export default ReaderSettingsPanel;
