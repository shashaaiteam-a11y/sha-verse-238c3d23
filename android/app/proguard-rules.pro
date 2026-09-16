# ============================================================
# SHA-VERSE R8 / ProGuard rules
# Goal: maximise obfuscation / optimisation / shrinking scores
# while keeping ONLY the reflection + native entry points that
# Capacitor, Cordova plugins, Firebase/FCM, AdMob and Capgo
# Social Login genuinely require at runtime.
#
# Deliberately NO package-wide "-keep class <pkg>.** { *; }"
# rules: those block R8 optimisation and lower Play Console's
# obfuscation percentage.
# ============================================================

# Readable crash reports (mapping.txt is uploaded to Play/Crashlytics).
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Metadata required by reflection-based frameworks.
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepattributes AnnotationDefault

# ---------- Capacitor bridge (reflection only) ----------
# Plugins are discovered by annotation and invoked by method name.
-keep @com.getcapacitor.annotation.CapacitorPlugin class * {
    @com.getcapacitor.PluginMethod <methods>;
    public <init>(...);
}
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod <methods>;
    public <init>(...);
}
# Plugin config / result objects instantiated reflectively by the bridge.
-keepclassmembers class com.getcapacitor.JSObject { public <init>(...); }
-keepclassmembers class com.getcapacitor.PluginCall { public <methods>; }

# ---------- Cordova plugins bridged through Capacitor ----------
-keepclassmembers class * extends org.apache.cordova.CordovaPlugin {
    public <init>(...);
    public boolean execute(java.lang.String, org.json.JSONArray, org.apache.cordova.CallbackContext);
    public void onActivityResult(int, int, android.content.Intent);
    public void onRequestPermissionResult(int, java.lang.String[], int[]);
}

# ---------- JavaScript interfaces exposed to the WebView ----------
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ---------- Firebase Cloud Messaging ----------
# Manifest-declared components are kept automatically; only the
# service subclass entry points need protecting from renaming.
-keepclassmembers class * extends com.google.firebase.messaging.FirebaseMessagingService {
    public <init>(...);
    public void onMessageReceived(com.google.firebase.messaging.RemoteMessage);
    public void onNewToken(java.lang.String);
}
-dontwarn com.google.firebase.**

# ---------- Google Play services / AdMob ----------
# GMS ships its own consumer ProGuard rules; do not blanket-keep it.
-dontwarn com.google.android.gms.**

# ---------- Capgo Social Login (native Google sign-in) ----------
# Only the plugin entry points (covered by the Capacitor rules above)
# are required; suppress warnings for optional Apple/Facebook paths.
-dontwarn ee.forgr.capacitor.social.login.**

# ---------- Kotlin ----------
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**
-dontwarn org.jetbrains.annotations.**
-dontwarn javax.annotation.**

# ---------- Enums & Parcelables (reflection-based) ----------
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}
-keepclassmembers class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# ---------- Native methods ----------
-keepclasseswithmembernames class * {
    native <methods>;
}
