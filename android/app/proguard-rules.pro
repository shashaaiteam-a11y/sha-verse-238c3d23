# ============================================================
# SHA-VERSE R8 / ProGuard rules
# Goal: obfuscate + shrink app code (Google Play optimisation
# threshold) WITHOUT breaking Capacitor, plugins, Firebase,
# AdMob, Google Sign-In or the WebView bridge.
# ============================================================

# Keep readable crash reports (mapping.txt is uploaded by Play).
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Reflection / serialization metadata used by Capacitor + GMS.
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepattributes AnnotationDefault

# ---------- Capacitor core & bridge ----------
# Capacitor resolves plugins and @PluginMethod entries by reflection.
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod <methods>;
}
-keep class com.getcapacitor.plugin.** { *; }

# ---------- Cordova plugins bridged through Capacitor ----------
-keep class org.apache.cordova.** { *; }
-keep class * extends org.apache.cordova.CordovaPlugin { *; }

# ---------- App package (Application / MainActivity, native entry points) ----------
-keep class com.shaverse.app.** { *; }

# ---------- JavaScript interfaces exposed to the WebView ----------
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ---------- Firebase / FCM push ----------
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**
-keep class * extends com.google.firebase.messaging.FirebaseMessagingService { *; }

# ---------- AdMob ----------
-keep class com.google.android.gms.ads.** { *; }
-keep public class com.google.android.gms.ads.MobileAds { *; }

# ---------- Capgo Social Login (native Google sign-in) ----------
-keep class ee.forgr.capacitor.social.login.** { *; }
-dontwarn ee.forgr.capacitor.social.login.**

# ---------- AndroidX / Kotlin ----------
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
