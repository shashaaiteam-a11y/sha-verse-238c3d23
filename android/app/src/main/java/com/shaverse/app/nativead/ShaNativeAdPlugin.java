package com.shaverse.app.nativead;

import android.app.Activity;
import android.util.DisplayMetrics;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.TextView;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdLoader;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.nativead.MediaView;
import com.google.android.gms.ads.nativead.NativeAd;
import com.google.android.gms.ads.nativead.NativeAdView;

import com.shaverse.app.R;

import java.util.HashMap;
import java.util.Map;

/**
 * Google AdMob Native Advanced ads for the SHA-VERSE Android app.
 *
 * The web layer reserves an empty container for every ad slot and reports its
 * on-screen rectangle. This plugin renders a real NativeAdView on top of that
 * rectangle, so the Google Mobile Ads SDK owns all asset rendering, the
 * AdChoices overlay, impression accounting and click handling. The web layer
 * never draws ad assets and never handles ad clicks.
 */
@CapacitorPlugin(name = "ShaNativeAd")
public class ShaNativeAdPlugin extends Plugin {

    private static boolean sdkInitialized = false;

    private static class Slot {
        NativeAdView view;
        NativeAd ad;
        boolean impressionSent;
    }

    private final Map<String, Slot> slots = new HashMap<>();

    private FrameLayout overlayRoot() {
        Activity activity = getActivity();
        if (activity == null) return null;
        View content = activity.findViewById(android.R.id.content);
        if (content instanceof FrameLayout) return (FrameLayout) content;
        return null;
    }

    private int toPx(double cssPx) {
        Activity activity = getActivity();
        if (activity == null) return (int) cssPx;
        DisplayMetrics dm = activity.getResources().getDisplayMetrics();
        return (int) Math.round(cssPx * dm.density);
    }

    private void emit(String event, String slotId, String placement, JSObject extra) {
        JSObject data = extra != null ? extra : new JSObject();
        data.put("slotId", slotId);
        data.put("placement", placement);
        notifyListeners(event, data);
    }

    @PluginMethod
    public void initialize(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("NO_ACTIVITY");
            return;
        }
        if (sdkInitialized) {
            call.resolve();
            return;
        }
        activity.runOnUiThread(() -> {
            MobileAds.initialize(activity, status -> {
                sdkInitialized = true;
                call.resolve();
            });
        });
    }

    /** Loads a native ad and attaches it at the given rectangle. */
    @PluginMethod
    public void load(final PluginCall call) {
        final String slotId = call.getString("slotId");
        final String adUnitId = call.getString("adUnitId");
        final String placement = call.getString("placement", "");
        if (slotId == null || adUnitId == null) {
            call.reject("MISSING_ARGS");
            return;
        }
        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("NO_ACTIVITY");
            return;
        }

        activity.runOnUiThread(() -> {
            destroySlot(slotId);

            AdLoader adLoader = new AdLoader.Builder(activity, adUnitId)
                .forNativeAd(nativeAd -> {
                    if (activity.isDestroyed() || activity.isFinishing()) {
                        nativeAd.destroy();
                        return;
                    }
                    attach(slotId, placement, nativeAd);
                    JSObject info = new JSObject();
                    info.put("headline", nativeAd.getHeadline() != null);
                    emit("adLoaded", slotId, placement, info);
                })
                .withAdListener(new AdListener() {
                    @Override
                    public void onAdFailedToLoad(LoadAdError error) {
                        JSObject info = new JSObject();
                        info.put("code", error.getCode());
                        info.put("message", error.getMessage());
                        emit("adFailed", slotId, placement, info);
                    }

                    @Override
                    public void onAdImpression() {
                        emit("adImpression", slotId, placement, null);
                    }

                    @Override
                    public void onAdClicked() {
                        emit("adClicked", slotId, placement, null);
                    }
                })
                .build();

            emit("adRequest", slotId, placement, null);
            adLoader.loadAd(new AdRequest.Builder().build());
            call.resolve();
        });
    }

    private void attach(String slotId, String placement, NativeAd nativeAd) {
        FrameLayout root = overlayRoot();
        Activity activity = getActivity();
        if (root == null || activity == null) {
            nativeAd.destroy();
            return;
        }

        NativeAdView adView = (NativeAdView) LayoutInflater.from(activity)
            .inflate(R.layout.sha_native_ad, root, false);

        TextView headline = adView.findViewById(R.id.sha_ad_headline);
        TextView body = adView.findViewById(R.id.sha_ad_body);
        TextView advertiser = adView.findViewById(R.id.sha_ad_advertiser);
        ImageView icon = adView.findViewById(R.id.sha_ad_icon);
        MediaView media = adView.findViewById(R.id.sha_ad_media);
        Button cta = adView.findViewById(R.id.sha_ad_cta);

        headline.setText(nativeAd.getHeadline());
        adView.setHeadlineView(headline);

        if (nativeAd.getBody() != null) {
            body.setText(nativeAd.getBody());
            body.setVisibility(View.VISIBLE);
            adView.setBodyView(body);
        } else {
            body.setVisibility(View.GONE);
        }

        if (nativeAd.getAdvertiser() != null) {
            advertiser.setText(nativeAd.getAdvertiser());
            advertiser.setVisibility(View.VISIBLE);
            adView.setAdvertiserView(advertiser);
        } else {
            advertiser.setVisibility(View.GONE);
        }

        if (nativeAd.getIcon() != null && nativeAd.getIcon().getDrawable() != null) {
            icon.setImageDrawable(nativeAd.getIcon().getDrawable());
            icon.setVisibility(View.VISIBLE);
            adView.setIconView(icon);
        } else {
            icon.setVisibility(View.GONE);
        }

        if (nativeAd.getMediaContent() != null) {
            media.setMediaContent(nativeAd.getMediaContent());
            media.setVisibility(View.VISIBLE);
            adView.setMediaView(media);
        } else {
            media.setVisibility(View.GONE);
        }

        if (nativeAd.getCallToAction() != null) {
            cta.setText(nativeAd.getCallToAction());
            cta.setVisibility(View.VISIBLE);
            adView.setCallToActionView(cta);
        } else {
            cta.setVisibility(View.GONE);
        }

        nativeAd.setOnPaidEventListener(adValue -> {
            JSObject info = new JSObject();
            info.put("valueMicros", adValue.getValueMicros());
            info.put("currency", adValue.getCurrencyCode());
            info.put("precision", adValue.getPrecisionType());
            emit("adPaid", slotId, placement, info);
        });

        adView.setNativeAd(nativeAd);
        adView.setVisibility(View.INVISIBLE);

        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(1, 1);
        root.addView(adView, lp);

        Slot slot = new Slot();
        slot.view = adView;
        slot.ad = nativeAd;
        slots.put(slotId, slot);
    }

    /** Positions an attached ad over the reserved web container. */
    @PluginMethod
    public void setBounds(final PluginCall call) {
        final String slotId = call.getString("slotId");
        if (slotId == null) {
            call.reject("MISSING_ARGS");
            return;
        }
        final double x = call.getDouble("x", 0d);
        final double y = call.getDouble("y", 0d);
        final double width = call.getDouble("width", 0d);
        final double height = call.getDouble("height", 0d);
        final boolean visible = Boolean.TRUE.equals(call.getBoolean("visible", true));

        Activity activity = getActivity();
        if (activity == null) {
            call.resolve();
            return;
        }
        activity.runOnUiThread(() -> {
            Slot slot = slots.get(slotId);
            if (slot == null || slot.view == null) {
                call.resolve();
                return;
            }
            ViewGroup.LayoutParams params = slot.view.getLayoutParams();
            if (params instanceof FrameLayout.LayoutParams) {
                FrameLayout.LayoutParams lp = (FrameLayout.LayoutParams) params;
                lp.width = Math.max(1, toPx(width));
                lp.height = Math.max(1, toPx(height));
                lp.leftMargin = toPx(x);
                lp.topMargin = toPx(y);
                slot.view.setLayoutParams(lp);
            }
            slot.view.setVisibility(visible ? View.VISIBLE : View.INVISIBLE);
            call.resolve();
        });
    }

    @PluginMethod
    public void destroy(PluginCall call) {
        final String slotId = call.getString("slotId");
        if (slotId == null) {
            call.resolve();
            return;
        }
        Activity activity = getActivity();
        if (activity == null) {
            call.resolve();
            return;
        }
        activity.runOnUiThread(() -> {
            destroySlot(slotId);
            call.resolve();
        });
    }

    private void destroySlot(String slotId) {
        Slot slot = slots.remove(slotId);
        if (slot == null) return;
        if (slot.view != null && slot.view.getParent() instanceof ViewGroup) {
            ((ViewGroup) slot.view.getParent()).removeView(slot.view);
        }
        if (slot.view != null) slot.view.destroy();
        if (slot.ad != null) slot.ad.destroy();
    }

    @Override
    protected void handleOnDestroy() {
        for (String slotId : new HashMap<>(slots).keySet()) {
            destroySlot(slotId);
        }
        super.handleOnDestroy();
    }
}
