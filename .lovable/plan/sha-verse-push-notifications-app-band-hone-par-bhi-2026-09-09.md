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

**Edge function `supabase/functions/send-push/index.ts**`

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
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
हाँ — **overall architecture सही direction में है**, लेकिन मैं इसे अभी **production-ready मानकर सीधे implement नहीं करूँगा**। इसमें कुछ बहुत अच्छे हिस्से हैं, और **4–5 महत्वपूर्ण जगहों पर बदलाव** करने चाहिए ताकि बाद में duplicate notifications, token cleanup, security या delivery failures की समस्या न आए। 🔔

### जो चीजें सही हैं ✅

- `push_tokens` जैसी device-token table रखना सही है। एक user के कई devices हो सकते हैं।
- Existing `notifications` table को source event की तरह इस्तेमाल करना सही है।
- `notifications` insert होने पर push dispatch करना सही architecture है। Supabase Database Webhooks भी `INSERT` के बाद asynchronous request भेजने के लिए `pg_net` इस्तेमाल करते हैं। ([Supabase](https://supabase.com/docs/guides/database/webhooks?utm_source=chatgpt.com))
- Supabase Edge Function से FCM को call करना सही है। FCM HTTP v1 device registration token पर message भेज सकता है। ([Firebase](https://firebase.google.com/docs/cloud-messaging/send/v1-api?utm_source=chatgpt.com))
- `notification + data.path` के जरिए tap पर सही screen खोलना सही approach है।
- Android + Web दोनों को एक common push architecture में रखना अच्छा है।
- `google-services.json already मौजूद है` और existing Android Firebase setup को reuse करना सही है।
- Existing in-app notification system को untouched रखना आपके "बिना नुकसान" वाले requirement के लिए बिल्कुल सही सोच है।

लेकिन अब **जहाँ मैं बदलाव करूँगा**:

---

## 1. सबसे बड़ा बदलाव: `AFTER INSERT trigger → pg_net → Edge Function`

यह technically काम कर सकता है, लेकिन मैं आपके production SHA-VERSE में **direct custom trigger को primary implementation नहीं बनाऊँगा**।

Supabase खुद Database Webhooks देता है, और उसके अनुसार webhook वास्तव में `pg_net` आधारित asynchronous trigger mechanism है। इससे database change को लंबे network request के कारण block नहीं करना पड़ता। ([Supabase](https://supabase.com/docs/guides/database/webhooks?utm_source=chatgpt.com))

इसलिए बेहतर:

```text
notifications INSERT
        ↓
Supabase Database Webhook
        ↓
send-push Edge Function
        ↓
FCM
```

न कि:

```text
notifications INSERT
        ↓
custom PL/pgSQL trigger
        ↓
pg_net
        ↓
Edge Function
```

### क्यों?

क्योंकि Dashboard में webhook की configuration, monitoring और management ज्यादा साफ रहती है; Supabase webhook call history को `net` schema में monitor करने की सुविधा भी देता है। ([Supabase](https://supabase.com/docs/guides/database/webhooks?utm_source=chatgpt.com))

---

# 2. `failure swallow` अच्छा है, लेकिन अधूरा है ⚠️

यह हिस्सा:

> "Trigger ke andar koi bhi failure notification insert ko fail nahi karegi"

**सही principle है।**

हम नहीं चाहते:

```text
Push failed
   ↓
notification INSERT failed
   ↓
Like/comment/message भी fail
```

लेकिन failure को केवल swallow नहीं करना चाहिए।

होना चाहिए:

```text
Notification INSERT ✅
       ↓
Push dispatch
       ↓
Success ✅ → log
Failure ❌ → log + retry/cleanup
```

यानी:

**Notification creation को कभी block नहीं करना है**, लेकिन push failure को **silently lose भी नहीं करना है**।

Firebase भी server environment के लिए retries with exponential backoff और secure credential handling की recommendation देता है। ([Firebase](https://firebase.google.com/docs/cloud-messaging/server-environment?utm_source=chatgpt.com))

---

# 3. `400 = token delete` मत करना ❌

आपके plan में यह लिखा है:

> `404 UNREGISTERED / 400 par wo token delete kar dega`

यह **बहुत important bug हो सकता है**।

Firebase की official docs कहती हैं कि:

- `UNREGISTERED` = HTTP 404 → token हटाना उचित है
- `INVALID_ARGUMENT` = HTTP 400 → **हमेशा token invalid नहीं होता**
- 400 payload की गलती, invalid data key, message size आदि के कारण भी आ सकता है। ([Firebase](https://firebase.google.com/docs/cloud-messaging/manage-tokens?authuser=0&hl=en&utm_source=chatgpt.com))

इसलिए logic होना चाहिए:

```text
404 + UNREGISTERED
        ↓
DELETE/DEACTIVATE token ✅
```

लेकिन:

```text
400 + INVALID_ARGUMENT
        ↓
पहले error details inspect
        ↓
क्या registration token invalid है?
   ├── YES → deactivate token
   └── NO  → keep token + log error
```

यह production में बहुत जरूरी है।

---

# 4. Web push वाला हिस्सा भी सही है, लेकिन wording सुधारनी होगी

आपने लिखा:

> Web/PWA — browser band hone par bhi notification.

यह **supported browser/OS conditions में सही है**। Web FCM service worker के जरिए background notifications support करता है; Firebase web setup में service worker और VAPID public key का इस्तेमाल होता है। ([Firebase](https://firebase.google.com/docs/cloud-messaging/web/get-started?utm_source=chatgpt.com))

लेकिन इसे ऐसे guarantee नहीं करना चाहिए:

> "हर browser में browser बंद होने पर हमेशा"

क्योंकि browser/OS permissions, platform restrictions और notification settings matter करती हैं।

Production wording:

**"Supported browsers में, permission मिलने के बाद background/web-push notifications."**

---

# 5. iPhone वाला हिस्सा ठीक है, लेकिन इसे अभी implementation से बाहर रखना बेहतर है

यह:

> native iOS app के लिए Apple developer certificate चाहिए होगा

सही direction है। लेकिन अभी:

```text
platform = android | web | ios
```

schema में `ios` रखना future compatibility के लिए ठीक है, **लेकिन iOS implementation आधा-अधूरा शुरू नहीं करना चाहिए**।

अभी actual active platforms:

```text
android
web
```

रखना पर्याप्त है।

Future में:

```text
ios
```

enable किया जा सकता है।

---

# 6. `push_tokens` table में मैं कुछ fields और जोड़ूँगा

Current:

```text
user_id
token
platform
device_label
last_seen_at
timestamps
```

अच्छा base है।

लेकिन production में मैं यह रखूँगा:

```text
push_tokens
──────────────────────────────
id
user_id
token
platform
device_id
device_label
app_version
enabled
last_seen_at
created_at
updated_at
```

### खासकर `device_id`

क्योंकि एक ही device का token बदल सकता है।

Firebase भी registration-token lifecycle को actively manage करने की recommendation देता है; tokens stale हो सकते हैं और system को invalid registrations remove करनी चाहिए। ([Firebase](https://firebase.google.com/docs/cloud-messaging/manage-tokens?authuser=0&hl=en&utm_source=chatgpt.com))

---

# 7. Token freshness system भी चाहिए

सिर्फ:

> token आया → save कर दिया

पर system खत्म नहीं होना चाहिए।

Better:

```text
app starts
   ↓
refresh/check token
   ↓
upsert
   ↓
last_seen_at = NOW()
```

और server-side stale token cleanup भी रखा जा सकता है।

Firebase की current guidance में stale registration management और freshness threshold की recommendation है। ([Firebase](https://firebase.google.com/docs/cloud-messaging/manage-tokens?authuser=0&hl=en&utm_source=chatgpt.com))

---

# 8. "Lovable connector gateway" वाला हिस्सा मुझे हटाना चाहिए

आपके specification में है:

> Lovable connector gateway ke through FCM HTTP v1

मैं इसे production architecture में इस wording के साथ नहीं रखूँगा।

सही conceptual path:

```text
Supabase Edge Function
        ↓
FCM HTTP v1
```

Supabase Edge Function server-side third-party APIs को call करने के लिए बनी है। ([Supabase](https://supabase.com/docs/guides/functions?utm_source=chatgpt.com))

FCM HTTP v1 के लिए service-account based OAuth credentials जैसी server authorization methods officially supported हैं। ([Firebase](https://firebase.google.com/docs/cloud-messaging/send/v1-api?utm_source=chatgpt.com))

**Lovable को FCM delivery middleman नहीं बनाना चाहिए।**

---

# 9. Firebase secret को लेकर आपकी architecture बहुत carefully करनी होगी

यह सबसे sensitive हिस्सा है।

FCM server credentials:

```text
❌ React
❌ public JS
❌ Capacitor app
❌ GitHub
❌ google-services.json में server private key
```

में नहीं जाने चाहिए।

बल्कि:

```text
Supabase Edge Function Secrets
        ↓
FCM authentication
```

Firebase भी server credentials और registration tokens को securely store करने की requirement बताता है। ([Firebase](https://firebase.google.com/docs/cloud-messaging/server-environment?utm_source=chatgpt.com))

---

# 10. Foreground/background logic बिल्कुल जरूरी है

आपकी plan में यह idea indirectly है, लेकिन इसे **explicit requirement** बनाना चाहिए।

### App foreground

```text
FCM event
   ↓
existing in-app notification system
```

और system notification की duplicate popup नहीं आनी चाहिए।

### App background/normal closed

```text
FCM
 ↓
Android notification tray
```

### User taps notification

```text
FCM payload
 ↓
path
 ↓
existing deep-link router
 ↓
correct screen
```

यह अच्छा architecture है।

---

# 11. `PushBridge.tsx` idea अच्छा है 👍

यह structure:

```text
src/lib/push/registerPush.ts
src/lib/push/handlePushTap.ts
src/components/push/PushBridge.tsx
```

मुझे पसंद है।

इसका फायदा:

```text
existing notification code
       ≠
push integration
```

अलग रहेगा।

यानी regression risk कम होगा।

---

# 12. लेकिन `App.tsx` में सिर्फ एक line डालने से काम पूरा नहीं मानना

यह line:

```tsx
<PushBridge />
```

ठीक है।

लेकिन `PushBridge` को login lifecycle समझना होगा:

```text
App Start
   ↓
Auth loading
   ↓
User authenticated?
   ├── NO → don't associate token
   └── YES
        ↓
register/update token
```

Logout:

```text
logout
 ↓
remove/deactivate user-device association
```

फिर नया user login:

```text
User B
 ↓
same physical phone
 ↓
token associated with User B
```

यह security requirement है।

---

# 13. एक बहुत जरूरी security point: device token ownership

RLS:

> user sirf apne tokens insert/update/delete/select kar sake

अच्छा है।

लेकिन मैं additionally ensure करूँगा:

```text
auth.uid() = user_id
```

और token assignment backend-side भी validate होगा।

वरना malicious client किसी दूसरे user's token row manipulate कर सकता है।

---

# 14. Settings में सिर्फ toggle काफी नहीं है

यह:

> "Phone par notifications"

अच्छा है।

लेकिन Android permission state भी दिखानी चाहिए:

```text
Notifications
──────────────
Phone notifications     ON

Likes                    ON
Comments                 ON
Messages                 ON
Groups                   ON

System permission:
Allowed ✅
```

अगर OS permission blocked:

```text
Notifications blocked

Open Android Settings
```

यूज़र को system settings तक भेजने का रास्ता होना चाहिए।

---

# 15. "सभी notifications" और "push preference" अलग concepts हैं

Existing:

```text
notifications
```

का मतलब:

> user के account में notification event मौजूद है।

Push preference:

```text
push enabled?
```

का मतलब:

> इस notification को physical device पर भेजना है या नहीं।

इन्हें merge नहीं करना चाहिए।

यह separation आपकी existing in-app notifications को सुरक्षित रखेगा।

---

# 16. Delivery log रखना बहुत अच्छा decision है

यह वाला हिस्सा मुझे खास तौर पर पसंद है:

```text
notification_delivery_logs
```

क्योंकि बाद में आप देख पाओगे:

```text
Notification #8237

Device A → delivered
Device B → UNREGISTERED
Device C → failed
```

और जब कोई user बोले:

> "मुझे notification नहीं मिला"

तो debugging possible होगी। 🔍

---

# 17. एक चीज और जोड़नी चाहिए: idempotency / duplicate prevention

मान लीजिए webhook दो बार invoke हो गया।

ऐसा नहीं होना चाहिए:

```text
Rahul liked your post

🔔 Rahul liked your post
🔔 Rahul liked your post
```

इसलिए push dispatch में:

```text
notification_id + device_id
```

के आधार पर delivery uniqueness रखनी चाहिए।

उदाहरण:

```text
unique(notification_id, device_id)
```

या equivalent idempotency logic।

---

# 18. आपकी "Security fix" को notification project से अलग रखना चाहिए

आपने नीचे लिखा है:

> Groups में admin approval वाली security समस्या भी fix होगी।

**यह fix सही है और करना चाहिए**, लेकिन मैं इसे उसी notification migration में bundle नहीं करूँगा।

बेहतर:

```text
Commit 1
Push Notifications

Commit 2
Groups Approval Security Fix
```

क्यों?

अगर push deployment में problem आती है तो आसानी से rollback हो सके।

और अगर groups security migration में issue आए तो push system प्रभावित न हो।

**Production change isolation** बहुत valuable है।

---

# 19. Final architecture मैं यह रखूँगा ✅

```text
                    SHA-VERSE EVENT
                          │
                          ▼
                notifications table
                          │
                          ▼
              Supabase Database Webhook
                          │
                    async pg_net
                          │
                          ▼
                 send-push Edge Function
                          │
             ┌────────────┴────────────┐
             │                         │
        user devices             preferences
             │
             ▼
          FCM HTTP v1
             │
       ┌─────┴─────┐
       │           │
    Android       Web
       │           │
       ▼           ▼
      🔔           🔔
       │
       ▼
   notification tap
       │
       ▼
existing deep-link router
       │
       ▼
correct SHA-VERSE screen
```

---

# 20. मेरा verdict

### Current plan: **लगभग 8/10 ✅**

लेकिन इन changes के बाद:

### **9.5/10 production architecture 🔥**

सबसे जरूरी corrections:


| हिस्सा                                      | Verdict                                   |
| ------------------------------------------- | ----------------------------------------- |
| Existing in-app notifications preserve करना | ✅ बहुत सही                                |
| Supabase + FCM                              | ✅ सही                                     |
| `push_tokens`                               | ✅ सही                                     |
| Multiple devices                            | ✅ सही                                     |
| Deep links                                  | ✅ सही                                     |
| Android Capacitor                           | ✅ सही                                     |
| Web FCM                                     | ✅ सही                                     |
| Supabase Edge Function                      | ✅ सही                                     |
| Database Webhook                            | ✅ बेहतर विकल्प                            |
| Raw trigger + pg_net                        | ⚠️ काम करेगा, लेकिन webhook prefer करूंगा |
| `400 → delete token`                        | ❌ बदलना जरूरी                             |
| Retry system                                | ⚠️ जरूरी                                  |
| Token freshness                             | ⚠️ जोड़ना चाहिए                           |
| Duplicate prevention                        | ⚠️ जोड़ना चाहिए                           |
| FCM credentials                             | ✅ server-side रखना                        |
| Lovable connector gateway                   | ❌ इस wording/architecture को हटाना चाहिए  |
| Groups security fix साथ में                 | ⚠️ अलग migration/commit                   |


### सबसे महत्वपूर्ण बात

**मैं इस specification को exactly वैसे Lovable में run नहीं करूँगा।** पहले ऊपर के corrections के साथ इसे final implementation specification बनाऊँगा। खासकर **FCM error handling, webhook architecture, token lifecycle, duplicate prevention और secrets** को ठीक किए बिना मैं इसे "production-ready" नहीं कहूँगा। Firebase की current guidance भी invalid-token cleanup, retry/backoff और secure credential handling पर जोर देती है। ([Firebase](https://firebase.google.com/docs/cloud-messaging/manage-tokens?authuser=0&hl=en&utm_source=chatgpt.com))

आपके SHA-VERSE के मामले में यह approach सही है क्योंकि **existing notification engine को replace करने के बजाय उसके ऊपर push-delivery layer जोड़ना** सबसे कम-risk वाला रास्ता है। 🚀