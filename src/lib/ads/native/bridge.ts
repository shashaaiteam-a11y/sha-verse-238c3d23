/**
 * Capacitor bridge to the Android `ShaNativeAd` plugin.
 *
 * On web this module is inert: every call resolves to a no-op so that the
 * existing web behaviour of SHA-VERSE stays exactly as it is and no broken
 * native placeholder is ever rendered.
 */
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export interface NativeAdEvent {
  slotId: string;
  placement: string;
  code?: number;
  message?: string;
  valueMicros?: number;
  currency?: string;
  precision?: number;
}

export interface ShaNativeAdPlugin {
  initialize(): Promise<void>;
  load(options: { slotId: string; adUnitId: string; placement: string }): Promise<void>;
  setBounds(options: {
    slotId: string;
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
  }): Promise<void>;
  destroy(options: { slotId: string }): Promise<void>;
  addListener(
    event: "adRequest" | "adLoaded" | "adFailed" | "adImpression" | "adClicked" | "adPaid",
    cb: (data: NativeAdEvent) => void,
  ): Promise<PluginListenerHandle>;
}

export const ShaNativeAd = registerPlugin<ShaNativeAdPlugin>("ShaNativeAd");

export const isNativeAdsSupported = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
