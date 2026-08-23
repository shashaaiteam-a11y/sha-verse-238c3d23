package com.shaverse.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.core.app.ActivityCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginHandle;

import ee.forgr.capacitor.social.login.GoogleProvider;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;

/**
 * Sha-Verse MainActivity — FINAL FIXED VERSION (v2)
 *
 * Fixes:
 *  - ✅ Gallery select not reacting on multi-image post composer
 *       → Custom onShowFileChooser hata diya. Capacitor ka BridgeWebChromeClient
 *         khud hi <input type=file>, multiple, image/*, video/* sab handle karta hai.
 *  - ✅ Camera / Mic getUserMedia (video calls, voice msg) → grant instantly
 *  - ✅ Runtime permissions for Android 6+ / 13+
 *  - ✅ WebView hardening (DOM storage, autoplay, mixed content)
 *  - ✅ Chrome DevTools debugging (chrome://inspect)
 *
 * Path: android/app/src/main/java/com/shaverse/app/MainActivity.java
 */
public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {

    private static final int PERMISSION_REQUEST_CODE = 4242;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // This must run before super.onCreate(): Capacitor creates and freezes
        // the native bridge plugin map inside BridgeActivity.onCreate().
        registerPlugin(SocialLoginPlugin.class);
        super.onCreate(savedInstanceState);

        // 1) Runtime permissions
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            String[] perms;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                perms = new String[]{
                        Manifest.permission.CAMERA,
                        Manifest.permission.RECORD_AUDIO,
                        Manifest.permission.MODIFY_AUDIO_SETTINGS,
                        Manifest.permission.READ_MEDIA_IMAGES,
                        Manifest.permission.READ_MEDIA_VIDEO,
                        Manifest.permission.READ_MEDIA_AUDIO
                };
            } else {
                perms = new String[]{
                        Manifest.permission.CAMERA,
                        Manifest.permission.RECORD_AUDIO,
                        Manifest.permission.MODIFY_AUDIO_SETTINGS,
                        Manifest.permission.READ_EXTERNAL_STORAGE
                };
            }
            boolean needAny = false;
            for (String p : perms) {
                if (checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED) {
                    needAny = true;
                    break;
                }
            }
            if (needAny) {
                ActivityCompat.requestPermissions(this, perms, PERMISSION_REQUEST_CODE);
            }
        }

        // 2) DevTools remote debugging
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        // 3) Harden WebView + extend Capacitor's WebChromeClient ONLY for getUserMedia.
        //    ⚠️ IMPORTANT: hum onShowFileChooser OVERRIDE NAHI karte — Capacitor
        //    ka BridgeWebChromeClient single + multiple file picker dono ko sahi
        //    se handle karta hai (profile pic, cover, post photos, videos sab).
        //    Pehle wala custom code multiple-select pe result lose kar deta tha.
        WebView webView = this.bridge.getWebView();
        if (webView != null) {
            WebSettings s = webView.getSettings();
            s.setJavaScriptEnabled(true);
            s.setDomStorageEnabled(true);
            s.setAllowFileAccess(true);
            s.setAllowContentAccess(true);
            s.setMediaPlaybackRequiresUserGesture(false);
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

            webView.setWebChromeClient(new BridgeWebChromeClient(this.bridge) {
                // Sirf camera/mic permission grant karte hain — file chooser
                // ko Capacitor ke parent class ko handle karne dete hain.
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                            request.grant(request.getResources());
                        }
                    });
                }
            });
        }
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode >= GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN &&
                requestCode < GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MAX) {
            PluginHandle pluginHandle = getBridge().getPlugin("SocialLogin");
            if (pluginHandle != null) {
                Plugin plugin = pluginHandle.getInstance();
                if (plugin instanceof SocialLoginPlugin) {
                    ((SocialLoginPlugin) plugin).handleGoogleLoginIntent(requestCode, data);
                }
            }
        }
    }

    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {
        // Marker required by the SocialLogin Google authorization flow.
    }
}
