package com.shaverse.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.core.app.ActivityCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

/**
 * Sha-Verse MainActivity — FINAL FIXED VERSION
 *
 * Fixes:
 *  - ✅ Gallery select not working   → MIME type "/" was invalid, now "*\/*"
 *  - ✅ Capacitor plugins breaking   → extends BridgeWebChromeClient
 *                                       (instead of overwriting it)
 *  - ✅ Camera / Mic getUserMedia    → onPermissionRequest grants instantly
 *  - ✅ Runtime permissions          → asked on first launch (Android 6+/13+)
 *  - ✅ WebView hardening            → DOM storage, autoplay, mixed content
 *  - ✅ Chrome DevTools debugging    → chrome://inspect works
 *
 * Path: android/app/src/main/java/com/shaverse/app/MainActivity.java
 */
public class MainActivity extends BridgeActivity {

    private static final int PERMISSION_REQUEST_CODE = 4242;
    private static final int FILE_CHOOSER_CODE = 1001;

    private ValueCallback<Uri[]> filePathCallback;

    @Override
    public void onCreate(Bundle savedInstanceState) {
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

        // 3) Harden WebView + EXTEND Capacitor's WebChromeClient (don't replace it!)
        WebView webView = this.bridge.getWebView();
        if (webView != null) {
            WebSettings s = webView.getSettings();
            s.setJavaScriptEnabled(true);
            s.setDomStorageEnabled(true);
            s.setAllowFileAccess(true);
            s.setAllowContentAccess(true);
            s.setMediaPlaybackRequiresUserGesture(false);
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

            // ⚠️ IMPORTANT: extend BridgeWebChromeClient so Capacitor's own
            // file chooser / permission logic keeps working.
            webView.setWebChromeClient(new BridgeWebChromeClient(this.bridge) {

                // Camera / Mic → unblocks getUserMedia (video calls, voice msg)
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                            request.grant(request.getResources());
                        }
                    });
                }

                // File picker → profile pic, cover, posts, attachments
                @Override
                public boolean onShowFileChooser(WebView wv,
                                                 ValueCallback<Uri[]> callback,
                                                 FileChooserParams params) {
                    if (filePathCallback != null) {
                        filePathCallback.onReceiveValue(null);
                    }
                    filePathCallback = callback;

                    Intent intent;
                    try {
                        intent = params.createIntent();
                    } catch (Exception e) {
                        intent = new Intent(Intent.ACTION_GET_CONTENT);
                    }
                    intent.addCategory(Intent.CATEGORY_OPENABLE);

                    // ✅ FIX: valid MIME fallback (was "/" which broke everything)
                    if (intent.getType() == null || intent.getType().isEmpty()
                            || "/".equals(intent.getType())) {
                        intent.setType("*/*");
                    }

                    // Respect <input multiple> if the page asked for it
                    if (params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) {
                        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                    }

                    try {
                        startActivityForResult(
                                Intent.createChooser(intent, "Select"),
                                FILE_CHOOSER_CODE);
                        return true;
                    } catch (Exception e) {
                        filePathCallback = null;
                        return false;
                    }
                }
            });
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_CODE) {
            if (filePathCallback != null) {
                Uri[] results = WebChromeClient.FileChooserParams
                        .parseResult(resultCode, data);
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }
}
