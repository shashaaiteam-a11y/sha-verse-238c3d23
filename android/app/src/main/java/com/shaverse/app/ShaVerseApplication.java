package com.shaverse.app;

import android.app.Application;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.graphics.Color;
import android.os.Build;

/** Creates the FCM channel as soon as Android starts the app process. */
public class ShaVerseApplication extends Application {
    public static final String PUSH_CHANNEL_ID = "sha_verse_alerts_v2";

    @Override
    public void onCreate() {
        super.onCreate();
        createPushChannel(this);
    }

    public static void createPushChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null || manager.getNotificationChannel(PUSH_CHANNEL_ID) != null) return;

        NotificationChannel channel = new NotificationChannel(
            PUSH_CHANNEL_ID,
            "SHA-VERSE Alerts",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Likes, comments, messages, friend requests and updates");
        channel.enableVibration(true);
        channel.enableLights(true);
        channel.setLightColor(Color.BLUE);
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        manager.createNotificationChannel(channel);
    }
}