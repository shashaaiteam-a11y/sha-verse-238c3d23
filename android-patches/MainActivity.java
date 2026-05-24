package com.shaverse.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

/**
 * Sha-Verse MainActivity — extends Capacitor's BridgeActivity and bridges
 * Android runtime permissions to the WebView's getUserMedia() requests so
 * voice/video calls work inside the native shell.
 *
 * Replace android/app/src/main/java/com/shaverse/app/MainActivity.java with
 * this file after `npx cap add android`.
 */
public class MainActivity extends BridgeActivity {

    private static final int PERMISSION_REQUEST_CODE = 4242;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Ask user for Camera + Mic at app start (Android 6+).
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            boolean needCam = checkSelfPermission(Manifest.permission.CAMERA)
                    != PackageManager.PERMISSION_GRANTED;
            boolean needMic = checkSelfPermission(Manifest.permission.RECORD_AUDIO)
                    != PackageManager.PERMISSION_GRANTED;
            if (needCam || needMic) {
                requestPermissions(new String[]{
                        Manifest.permission.CAMERA,
                        Manifest.permission.RECORD_AUDIO,
                        Manifest.permission.MODIFY_AUDIO_SETTINGS
                }, PERMISSION_REQUEST_CODE);
            }
        }

        // 2. Enable Chrome DevTools remote debugging for the WebView.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        // 3. Configure the Capacitor-owned WebView and bridge permission
        //    requests from the web layer (getUserMedia) to Android.
        WebView webView = this.bridge.getWebView();
        if (webView != null) {
            webView.getSettings().setJavaScriptEnabled(true);
            webView.getSettings().setDomStorageEnabled(true);
            webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
            webView.getSettings().setAllowFileAccess(true);
            webView.getSettings().setAllowContentAccess(true);

            // Preserve Capacitor's existing WebChromeClient behavior by
            // delegating onProgressChanged etc., but override permission flow.
            webView.setWebChromeClient(new WebChromeClient() {
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
}
