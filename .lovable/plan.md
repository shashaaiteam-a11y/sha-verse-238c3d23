# SHA-VERSE — Push Notifications (app band hone par bhi)

Abhi jo notifications hain wo sirf app khuli hone par dikhte hain. Yeh kaam app band hone par bhi phone ki notification tray mein alert bhejega — bilkul Facebook jaisa.

## Kya banega

1. **Har device ka "pata" save hoga** — jab user app kholta hai aur permission deta hai, uske phone ka notification address database mein save ho jaata hai (ek user ke kai phone/browser ho sakte hain).
2. **Jaise hi koi naya notification banta hai** (like, comment, friend request, message, group post, naya video — jo triggers pehle se hain), backend apne aap us user ke sabhi devices par push bhej dega.
3. **Notification par tap karte hi** app khulkar sahi jagah pahunch jayegi (post, profile, group, video, chat).
4. **Settings mein control** — user push on/off kar sakega, aur agar permission block hai to seedha guidance milega.

## Platforms

- **Android app (Capacitor)** — asli system notification, app band hone par bhi. Yeh primary target hai; Firebase already Android app se juda hua hai.
- **Web/PWA (Chrome, Edge, Android browser)** — browser band hone par bhi notification. Same system use karega.
- **iPhone** — Safari mein sirf tab kaam karta hai jab user app ko home screen par add kare; native iOS app ke liye Apple developer certificate chahiye hoga (abhi scope se bahar, code aage ke liye ready rahega).

## Aapko kya karna hoga (main nahi kar sakta)

- Firebase connection approve karni hogi (main chat mein card dikhaunga) — isse backend ko bhejne ki permission milegi.
- Web push ke liye Firebase console se ek "VAPID key" chahiye hogi — main batata hoon kahan se milegi.
- Android app ka naya build banakar Play Console par upload karna hoga (push native plugin ke saath aata hai, isliye purani APK se kaam nahi chalega).

## Technical details

**Database (naya table `push_tokens`)**
- Columns: `user_id`, `token` (unique), `platform` (`android` | `web` | `ios`), `device_label`, `last_seen_at`, timestamps.
- GRANTs + RLS: user sirf apne tokens insert/update/delete/select kar sake; `service_role` ko full access (edge function ke liye).

**Trigger → dispatch**
- `notifications` table par `AFTER INSERT` trigger jo `pg_net` se `send-push` edge function ko call karega (payload: notification id).
- Trigger ke andar koi bhi failure notification insert ko fail nahi karegi (exception swallow), taaki maujooda features par zero asar ho.

**Edge function `supabase/functions/send-push/index.ts`**
- Notification row padhega, user ke tokens laayega, user ke `user_settings` mein push preference check karega.
- Lovable connector gateway ke through FCM HTTP v1 par `messages:send` — har token ke liye, `notification` + `data.path` (deep link) ke saath.
- 404 `UNREGISTERED` / 400 par wo token delete kar dega (stale cleanup).

**Frontend (naye files, module-isolated)**
- `src/lib/push/registerPush.ts` — platform detect: native par `@capacitor/push-notifications`, web par Firebase JS SDK + VAPID key. Token milte hi `push_tokens` mein upsert.
- `src/lib/push/handlePushTap.ts` — payload ke `path` se maujooda deep-link router (`src/lib/deepLinks.ts`) par navigate.
- `src/components/push/PushBridge.tsx` — `App.tsx` ke andar mount hoga (ek line), login hote hi register karega, logout par token hata dega.
- `public/firebase-messaging-sw.js` — web background notifications ke liye.
- Settings page mein ek toggle: "Phone par notifications" (on/off + permission state).

**Native (Android)**
- `@capacitor/push-notifications` install, `android/app/build.gradle` + `AndroidManifest.xml` mein FCM service/permission entries (Capacitor plugin apne aap add karta hai, `npx cap sync` ke baad).
- `google-services.json` already maujood hai — koi change nahi.
- Notification icon + channel (`sha_verse_default`) set hoga.

**Kya nahi chhua jayega**
- Maujooda in-app notification system, `useNotifications`, `Notifications.tsx`, koi bhi module (Home, Movion, Bookshelf, Groups, Profile, NovaChat), ads, ya unrelated files — sab jaise hain waise rahenge. Sirf `App.tsx` mein ek bridge line aur Settings mein ek toggle add hoga.

## Security fix (alag se)

Groups mein ek suraksha samasya bhi milli hai: jin groups mein posts ko admin approval chahiye, wahan member khud apni post ko "approved" mark kar sakta tha. Isko theek kiya jayega — ab approval status sirf group admin/moderator badal sakega, baaki post edit karna pehle jaisa hi rahega.
