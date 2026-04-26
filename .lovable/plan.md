# 📱 SHA-VERSE — Native Mobile App + Play Store + AdMob Complete Plan

## ⚠️ Pehle Important Clarification

**Sawaal**: "Kya SDK install karne se mobile fitting auto-fix ho jayegi?"
**Jawab**: ❌ **NAHI**. Capacitor sirf web app ko native wrapper deta hai. Agar abhi components mobile mein screen se bahar nikal rahe hain, toh APK mein bhi **wahi problem aayegi**. Pehle responsive issues fix karne honge, phir build.

**Sawaal**: "Kya kuch tootega?"
**Jawab**: ✅ Nahi, agar yeh plan exact follow karein. Aapka project pehle se hi tayyar hai:
- ✅ Capacitor configured (`capacitor.config.ts`)
- ✅ AdMob plugin installed (`@capacitor-community/admob`)
- ✅ AdMob test mode active (`USE_TEST_ADS = true`)
- ✅ Mobile context, splash, status bar setup hain

Hum sirf 3 cheezein karenge: **Responsive fixes → Real AdMob IDs → Build & Publish**. Modules/features/UI ka logic chhua nahi jayega.

---

## 🎯 PHASE 1: Mobile Responsive Fixes (Lovable mein)

### Goal
Sabhi screens ko 320px se 480px width tak perfect fit karna — bina kisi feature ko toda.

### Steps (sirf CSS/Tailwind level changes):
1. **Global overflow lockdown**: `src/index.css` mein `html, body { overflow-x: hidden; max-width: 100vw }` ensure karna
2. **Audit components for overflow**:
   - Movion video player controls
   - NovaChat message bubbles ka long text wrap
   - Bookshelf book cards aur category strip
   - Groups admin panel ke 4 tabs
   - Profile header buttons row (Photos/Videos/Friends)
   - Settings dialogs (privacy, upload book, create group)
3. **Touch target audit**: Sabhi buttons ≥ 44px height (mobile guidelines)
4. **Safe-area insets**: `env(safe-area-inset-*)` use karna notch wale phones ke liye
5. **Test viewport**: 320px (smallest), 375px (iPhone SE), 414px (large phones)

**Result**: Browser preview pe mobile view perfect → APK mein bhi perfect

---

## 🎯 PHASE 2: GitHub Export (One-time setup)

Capacitor Lovable sandbox mein run nahi hota — native build aapke local computer pe karna hota hai.

### Step-by-step:
1. Lovable editor → top-right **GitHub** button → **Connect to GitHub** → authorize
2. **Create Repository** — naya repo ban jayega (e.g., `sha-verse`)
3. Apne computer pe install karein:
   - **Node.js 20+**: https://nodejs.org
   - **Android Studio**: https://developer.android.com/studio
   - **Java JDK 17+** (Android Studio ke saath aata hai)
   - **Git**: https://git-scm.com
4. Terminal kholein:
   ```bash
   git clone https://github.com/YOUR-USERNAME/sha-verse.git
   cd sha-verse
   npm install
   ```

---

## 🎯 PHASE 3: Capacitor Native Setup (Computer pe)

Aapke project mein Capacitor **already configured** hai. Sirf platform add karna hai.

### `capacitor.config.ts` ko production mode mein switch karna:
```typescript
// REMOVE the server.url block before production build (it points to Lovable preview)
// Production build mein local dist/ folder use hota hai
const config: CapacitorConfig = {
  appId: 'app.lovable.b16b27b99c4646308c45b59b2b0e9094',
  appName: 'Nexus',
  webDir: 'dist',
  // server: { ... }  ← yeh production ke liye REMOVE/COMMENT karein
  plugins: { ... } // baaki sab same rahega
};
```

### Commands (terminal mein):
```bash
# 1. Android platform add karein (one-time)
npx cap add android

# 2. Web build
npm run build

# 3. Native project mein sync (har web change ke baad)
npx cap sync android

# 4. Android Studio mein open karein
npx cap open android
```

Android Studio mein project khulega → **Run button (▶️)** dabaayein → Emulator/connected phone pe app chalega.

---

## 🎯 PHASE 4: AdMob Real IDs Setup

### A. AdMob Account Banayein
1. https://admob.google.com pe jayein → Google account se sign in
2. **Apps** → **Add App** → "I haven't published yet" select karein
3. App Name: **Nexus** (ya Sha-Verse), Platform: **Android**
4. App ID milega: `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX` — **note karein**

### B. Ad Units Banayein (10 units total)
AdMob dashboard mein **Ad Units** tab → har ek ke liye "Add ad unit":

| Ad Unit Name | Type | Use For |
|---|---|---|
| Banner_Main | Banner | Bottom sticky banner |
| Native_Feed | Native Advanced | Home/Group feed cards |
| Rewarded_Reward | Rewarded | NovaChat msgs, Bookshelf premium |
| Video_PreRoll | Rewarded Interstitial | Movion video pre-roll |
| Video_MidRoll | Rewarded Interstitial | Movion mid-roll |
| Shorts_Ad | Native | Shorts scroll ads |
| Sponsored_Story | Native | Story sponsored |
| Sponsored_Group | Native | Group suggestions |
| Sponsored_Suggestion | Native | PYMK sponsored |
| Sticky_Banner | Banner | Sticky bottom |

Har unit ka ID copy karein (`ca-app-pub-XXX/YYY` format).

### C. Code mein paste karein
**File**: `src/lib/ads/adConfig.ts`

```typescript
export const USE_TEST_ADS = false;  // ⚠️ ONLY when ready to publish!

const LIVE_AD_IDS = {
  banner: "ca-app-pub-YOUR-ID/BANNER-ID",
  native: "ca-app-pub-YOUR-ID/NATIVE-ID",
  rewarded: "ca-app-pub-YOUR-ID/REWARDED-ID",
  videoPreRoll: "ca-app-pub-YOUR-ID/PREROLL-ID",
  videoMidRoll: "ca-app-pub-YOUR-ID/MIDROLL-ID",
  shorts: "ca-app-pub-YOUR-ID/SHORTS-ID",
  sponsoredStory: "ca-app-pub-YOUR-ID/STORY-ID",
  sponsoredGroup: "ca-app-pub-YOUR-ID/GROUP-ID",
  sponsoredSuggestion: "ca-app-pub-YOUR-ID/SUGG-ID",
  stickyBanner: "ca-app-pub-YOUR-ID/STICKY-ID",
} as const;
```

### D. Android Manifest mein App ID daalein
**File**: `android/app/src/main/AndroidManifest.xml`

`<application>` tag ke andar yeh add karein:
```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"/>
```

### 🚨 CRITICAL Rules
- ❌ **Apne ads kabhi click na karein** (account permanent ban!)
- ❌ Friends/family ko bhi mat kehna click karne
- ✅ Real users naturally click karenge — wahi paisa hai
- ⏳ **First payment threshold**: $100 (approximately ₹8,300)
- 💰 **Payment**: Bank transfer monthly (21st around)

---

## 🎯 PHASE 5: Production Build (APK/AAB)

### Step 1: App icon aur splash screen
- App icon: `1024x1024 PNG` banayein (Canva/Figma se)
- https://icon.kitchen pe upload → Android icon set download
- `android/app/src/main/res/` ke andar `mipmap-*` folders mein paste

### Step 2: App signing key (one-time, **bahut important**)
Terminal mein:
```bash
cd android/app
keytool -genkey -v -keystore sha-verse-release.keystore \
  -alias sha-verse -keyalg RSA -keysize 2048 -validity 10000
```
- Password yaad rakhein (kabhi kho na jaye!)
- `sha-verse-release.keystore` file ko **backup karein** (Google Drive, USB)

### Step 3: Signing config
**File**: `android/app/build.gradle`
```gradle
android {
  signingConfigs {
    release {
      storeFile file('sha-verse-release.keystore')
      storePassword 'YOUR_PASSWORD'
      keyAlias 'sha-verse'
      keyPassword 'YOUR_PASSWORD'
    }
  }
  buildTypes {
    release {
      signingConfig signingConfigs.release
      minifyEnabled true
    }
  }
}
```

### Step 4: Production AAB build
Play Store ko **AAB (Android App Bundle)** chahiye, APK nahi.
```bash
cd android
./gradlew bundleRelease
```
Output: `android/app/build/outputs/bundle/release/app-release.aab`

---

## 🎯 PHASE 6: Play Store Publishing

### Step 1: Google Play Console account
1. https://play.google.com/console pe jayein
2. **One-time fee: $25** (approx ₹2,100) credit/debit card se
3. Identity verification (aadhar/passport) — 1-3 din
4. Account approve hone ka wait karein

### Step 2: New App Create karein
Play Console → **Create app**:
- App name: **Nexus** (ya jo aapne rakha hai)
- Default language: English (US) ya Hindi
- App or Game: **App**
- Free or Paid: **Free**
- Declarations checkbox tick karein

### Step 3: App Setup (Left sidebar mein har section complete karein)

| Section | Kya Karna Hai |
|---|---|
| **App access** | "All functionality available without restrictions" ya test login provide karein |
| **Ads** | ✅ "Yes, my app contains ads" select karein (AdMob ke liye) |
| **Content rating** | Questionnaire fill karein (chat app → mostly Teen) |
| **Target audience** | Age 13+ (chat/social ke liye) |
| **News app** | No |
| **COVID-19** | No |
| **Data safety** | Form fill karein — kya data collect karte ho (email, photos, messages) |
| **Government app** | No |
| **Financial features** | No (jab tak payments add nahi) |
| **Health** | No |

### Step 4: Store Listing (App ka description)
**Main store listing** section:
- **App name**: Nexus
- **Short description** (80 chars): "Connect, chat, watch, read — all in one social universe"
- **Full description** (4000 chars): Features ka detailed description
- **App icon**: 512x512 PNG
- **Feature graphic**: 1024x500 PNG (banner)
- **Phone screenshots**: Min 2, max 8 (1080x1920 recommended)
- **Tablet screenshots**: Optional but recommended
- **Privacy policy URL**: ⚠️ **Mandatory** — https://www.privacypolicies.com pe free generate karein

### Step 5: Internal Testing (Pehle yeh karein, production direct nahi!)
1. **Testing → Internal testing** → **Create new release**
2. AAB file upload karein (`app-release.aab`)
3. Release notes likhein: "Initial release"
4. **Testers**: apna email + 2-3 friends ke email add karein
5. Opt-in URL share karein → install karke test karein
6. **Bugs fix karein** → naya AAB upload → repeat

### Step 6: Production Release
1. **Production → Create new release**
2. Same AAB upload (ya naya version)
3. **Countries**: India + jahan launch karna (ya All countries)
4. **Review release** → **Start rollout to Production**
5. **Google review**: 1-7 days (pehli baar usually 3-5 din)
6. Approve hone par email aayega → app live!

---

## 🎯 PHASE 7: Post-Launch AdMob Verification

App live hone ke baad:
1. AdMob dashboard → **Apps** → aapki app select karein
2. **App-ads.txt verification** required hoga
3. Play Store listing URL paste karein → AdMob auto-verify karega
4. 24-48 ghante mein real ads dikhna start honge
5. Earnings dashboard mein impressions/clicks/revenue dikhega

---

## ✅ Kya Tootega? (Honest Answer)

| Cheez | Status |
|---|---|
| Sabhi 6 modules (Home, Movion, NovaChat, Bookshelf, Groups, Profile) | ✅ Same rahenge |
| Realtime features (chats, reactions, posts) | ✅ Same kaam karenge |
| Authentication (Google, Phone, Email) | ✅ Same kaam karega |
| Supabase backend / Lovable Cloud | ✅ Bilkul same |
| UI/UX layouts | ✅ Same — sirf mobile pe better fit |
| Ad placements | ✅ Same — sirf test → real IDs switch |
| Existing features ka logic | ✅ Bilkul nahi chhuenge |

**Risk areas**:
- Agar capacitor.config.ts mein `server.url` production build mein remove na karein → app preview pe stuck rahega
- Agar `USE_TEST_ADS = false` development mein karein aur khud click karein → AdMob ban
- Agar keystore file kho jaye → app ko kabhi update nahi kar sakte (naya app banana padega)

---

## 📋 Aapka Action Plan (Order)

1. ✅ **Abhi Lovable mein**: Mobile responsive fixes (Phase 1) — main yeh karunga jab aap approve karein
2. 📤 **Aap karein**: GitHub export + local computer setup (Phase 2)
3. 💻 **Aap karein**: Android Studio install + `npx cap add android` (Phase 3)
4. 💰 **Aap karein**: AdMob account + 10 ad units banayein (Phase 4 A-B)
5. 🔧 **Aap karein**: Real AdMob IDs paste + AndroidManifest update (Phase 4 C-D)
6. 📦 **Aap karein**: Production build with signing key (Phase 5)
7. 🏪 **Aap karein**: Play Console $25 + app submit (Phase 6)
8. 🎉 **Wait**: Google review (3-7 din) → app LIVE!

---

## 🚀 Approval Ke Baad Main Kya Karunga?

Is plan ko approve karne ke baad main **sirf Phase 1** execute karunga (Lovable mein possible kaam):

1. **Mobile responsive audit & fixes** — har module ke un components ko fix karunga jo screen se bahar nikal rahe hain
2. **Overflow guards** — global `overflow-x: hidden` strict karunga
3. **Touch target enforcement** — sabhi interactive elements 44px+ ensure karunga
4. **Safe-area insets** — notch wale phones ke liye padding
5. **Capacitor production-ready config** — `server.url` ko comment karne ki guideline document karunga (aap local mein remove karenge build se pehle)

Phase 2-7 aap apne computer pe execute karenge — main har step mein detailed help dunga jab aap puchhenge.

**Yeh plan approve karein, aur main Phase 1 (mobile responsive fixes) start kar dunga — bina kisi module/feature ko chhede.**
