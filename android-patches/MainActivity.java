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

/**
 * Sha-Verse MainActivity — COMPLETE MERGED VERSION
 *
 * Combines:
 *  - Capacitor BridgeActivity (so all Capacitor plugins keep working)
 *  - Runtime permission requests (Camera, Mic, Storage, Media)
 *  - WebChromeClient.onPermissionRequest  -> unlocks getUserMedia()
 *      (voice/video calls, voice messages)
 *  - WebChromeClient.onShowFileChooser    -> unlocks <input type="file">
 *      (profile picture, cover photo, post images/videos, attachments)
 *  - WebView hardening (DOM storage, mixed content, autoplay, file access)
 *  - Chrome DevTools remote debugging (chrome://inspect)
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

        // 1. Runtime permissions (Android 6+). Asking for everything we may
        //    ever need so the WebView never silently blocks a feature.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            String[] perms;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                // Android 13+: granular media permissions
                perms = new String[]{
                        Manifest.permission.CAMERA,
                        Manifest.permission.RECORD_AUDIO,
                        Manifest.permission.MODIFY_AUDIO_SETTINGS,
                        Manifest.permission.READ_MEDIA_IMAGES,
                        Manifest.permission.READ_MEDIA_VIDEO,
                        Manifest.permission.READ_MEDIA_AUDIO
                };
            } else {
                // Android 6–12: legacy storage permission
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

        // 2. Enable Chrome DevTools remote debugging for the WebView.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        // 3. Configure the Capacitor-owned WebView and bridge browser APIs
        //    (getUserMedia + file chooser) to the native layer.
        WebView webView = this.bridge.getWebView();
        if (webView != null) {
            WebSettings s = webView.getSettings();
            s.setJavaScriptEnabled(true);
            s.setDomStorageEnabled(true);
            s.setAllowFileAccess(true);
            s.setAllowContentAccess(true);
            s.setMediaPlaybackRequiresUserGesture(false);
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

            webView.setWebChromeClient(new WebChromeClient() {

                // 🔥 Camera / Mic — video calls, voice messages, getUserMedia
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                            request.grant(request.getResources());
                        }
                    });
                }

                // 🔥 File picker — profile pic, cover photo, posts, attachments
                @Override
                public boolean onShowFileChooser(WebView wv,
                                                 ValueCallback<Uri[]> callback,
                                                 FileChooserParams params) {
                    if (filePathCallback != null) {
                        filePathCallback.onReceiveValue(null);
                    }
                    filePathCallback = callback;

                    Intent intent = params.createIntent();
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    // Honor what the page asked for (image/*, video/*, etc.)
                    if (intent.getType() == null) {
                        intent.setType("*/*");
                    }
                    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);

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
