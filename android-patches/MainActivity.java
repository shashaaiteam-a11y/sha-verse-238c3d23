package com.shaverse.app;

import android.Manifest;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.net.Uri;

import androidx.core.app.ActivityCompat;

import com.getcapacitor.BridgeActivity;

/**
 * Sha-Verse MainActivity
 *
 * Path: android/app/src/main/java/com/shaverse/app/MainActivity.java
 *
 * Fixes:
 *  - File picker (profile pic, cover, post images/videos, story upload, chat media)
 *    via WebChromeClient.onShowFileChooser
 *  - Camera + Mic for voice / video calls via WebChromeClient.onPermissionRequest
 *  - Runtime permission prompt on first launch
 *  - Autoplay, DOM storage, mixed content, file access enabled on WebView
 *
 * No JS / Lovable code changes required.
 */
public class MainActivity extends BridgeActivity {

    private ValueCallback<Uri[]> filePathCallback;
    private static final int FILE_CHOOSER_CODE = 1001;
    private static final int PERMISSION_CODE   = 2001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Request runtime permissions on first launch (Android 6+).
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            String[] perms;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                // Android 13+
                perms = new String[] {
                    Manifest.permission.CAMERA,
                    Manifest.permission.RECORD_AUDIO,
                    Manifest.permission.MODIFY_AUDIO_SETTINGS,
                    Manifest.permission.READ_MEDIA_IMAGES,
                    Manifest.permission.READ_MEDIA_VIDEO,
                    Manifest.permission.READ_MEDIA_AUDIO
                };
            } else {
                perms = new String[] {
                    Manifest.permission.CAMERA,
                    Manifest.permission.RECORD_AUDIO,
                    Manifest.permission.MODIFY_AUDIO_SETTINGS,
                    Manifest.permission.READ_EXTERNAL_STORAGE
                };
            }
            ActivityCompat.requestPermissions(this, perms, PERMISSION_CODE);
        }

        // 2. Enable Chrome DevTools remote debugging (chrome://inspect).
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        // 3. Configure the Capacitor WebView and wire up media + file bridges.
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

                // Camera / Mic — voice & video calls, voice messages
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                            request.grant(request.getResources());
                        }
                    });
                }

                // File picker — profile pic, cover, post media, story, chat
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
                    intent.setType("*/*");
                    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                    try {
                        startActivityForResult(
                            Intent.createChooser(intent, "Select"),
                            FILE_CHOOSER_CODE
                        );
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
        if (requestCode == FILE_CHOOSER_CODE && filePathCallback != null) {
            Uri[] results = WebChromeClient.FileChooserParams
                .parseResult(resultCode, data);
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }
}
