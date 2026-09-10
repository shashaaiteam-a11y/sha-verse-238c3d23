package com.shaverse.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginHandle;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import ee.forgr.capacitor.social.login.GoogleProvider;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {
    /** Must match the FCM default channel declared in AndroidManifest.xml. */
    private static final String PUSH_CHANNEL_ID = "sha_verse_default";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register before BridgeActivity creates the Capacitor bridge. This is a
        // durable fallback for APKs where capacitor.plugins.json was not copied
        // during sync; registering after super.onCreate() is too late because the
        // bridge and its plugin map already exist at that point.
        registerPlugin(SocialLoginPlugin.class);
        registerPlugin(PushNotificationsPlugin.class);
        createPushChannel();
        super.onCreate(savedInstanceState);
    }

    /**
     * Android 8+ silently drops notifications whose channel does not exist yet.
     * Creating it natively at startup guarantees the channel is present even when
     * the very first push arrives while the app is closed.
     */
    private void createPushChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null || manager.getNotificationChannel(PUSH_CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(
            PUSH_CHANNEL_ID, "SHA-VERSE", NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("Likes, comments, messages, friend requests and updates");
        channel.enableVibration(true);
        channel.enableLights(true);
        channel.setLightColor(Color.BLUE);
        channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
        manager.createNotificationChannel(channel);
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        // Native Google intent handle karne ke liye
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
        // Flag method for the plugin
    }
}
