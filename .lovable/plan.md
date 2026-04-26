
# NovaChat 3-Phase System — Implementation Plan

## 🎯 Aapka Decision Summary
- **Phase 1**: Current secure backend (Lovable AI Gateway via `novachat-ai` edge function) **as-is rakhna hai**. Koi backend change nahi.
- **Phase 2**: Daily limit **10 messages/day** for free users.
- **Phase 3**: Pro Upgrade UI **+ real Stripe payments enable**.

---

## 📋 Phase 1 — UI Polish Only (No Backend Touch)

NovaChat ka current UI already polished hai. Sirf chhote refinements karenge taaki "premium ChatGPT competitor" feel aaye:

**Files affected:**
- `src/components/novachat/ChatInput.tsx` — input box ke focus state, gradient border, smoother animations
- `src/components/novachat/ChatMessage.tsx` — message bubbles ke spacing/typography refine
- `src/components/novachat/ChatSidebar.tsx` — "Upgrade to Pro" button add (Phase 3 trigger)
- `src/components/novachat/WelcomeScreen.tsx` — minor visual polish

**Constraints respected:**
- ✅ Edge function `novachat-ai` untouched (LOVABLE_API_KEY safe)
- ✅ Module isolation — sirf `src/components/novachat/*` aur `src/hooks/useNovaChat.ts` me changes
- ✅ Dark + Light theme dono support
- ✅ Mobile-first, no horizontal scroll
- ✅ Existing chat logic, history, attachments, voice — sab as-is

---

## 📋 Phase 2 — Rate Limiting (10 messages/day for Free users)

### Database (new migration)
Naya table `novachat_usage` (existing tables touch nahi karenge):

```sql
CREATE TABLE public.novachat_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, usage_date)
);

ALTER TABLE public.novachat_usage ENABLE ROW LEVEL SECURITY;

-- User can only read their own usage
CREATE POLICY "Users read own usage" ON public.novachat_usage
  FOR SELECT USING (auth.uid() = user_id);
```

Add `is_pro` flag to `novachat_settings` (Phase 3 ready):
```sql
ALTER TABLE public.novachat_settings 
  ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMPTZ;
```

RPC function for atomic check + increment (security definer):
```sql
CREATE FUNCTION public.check_and_increment_nova_usage(_user_id UUID)
RETURNS jsonb
-- Returns: { allowed: bool, used: int, limit: int, is_pro: bool }
-- Pro users: always allowed, no increment
-- Free users: check 10/day limit, increment if allowed
```

### Edge Function (`novachat-ai/index.ts`)
Edge function ke top me, validation ke baad, RPC call:
- Pro user → skip limit, proceed
- Free user → call `check_and_increment_nova_usage`
- If `allowed: false` → return `429` with `{ error: 'daily_limit_reached', used, limit }`

### Frontend (`useNovaChat.ts`)
- 429 response handle karke `setLimitReached(true)` state set karna
- `useNovaUsage()` hook — current day ka usage fetch karna (sidebar me "7/10 messages today" dikhane ke liye)

### UI — Limit Reached Modal
New file: `src/components/novachat/LimitReachedModal.tsx`
- Beautiful gradient modal
- "Aapki aaj ki 10 free messages khatam ho gayi hain"
- "Upgrade to Pro for Unlimited" CTA → opens Pricing modal (Phase 3)
- "Reset in: X hours Y minutes" countdown
- Dark + Light theme

Sidebar me chhota usage indicator: `7 / 10 messages today` (Pro users ko nahi dikhega).

---

## 📋 Phase 3 — Pro Upgrade + Real Stripe Payments

### Step 1: Pricing Modal UI
New file: `src/components/novachat/PricingModal.tsx`
- 2 cards side-by-side:
  - **Free** — 10 messages/day, ads, basic models
  - **Pro** — Unlimited messages, no ads, all models (Gemini 2.5 Pro, GPT-5), priority
- Premium look: gradient borders, checkmarks, "Most Popular" badge on Pro
- Dark + Light theme

### Step 2: Enable Stripe Payments (Lovable Built-in)
**⚠️ Important pre-requisites jo aap ko karne padenge:**
1. **Pro Lovable plan required** — Payments feature ke liye.
2. Main `payments--recommend_payment_provider` chalaunga taaki confirm ho NovaChat (digital SaaS) ke liye Stripe eligible hai.
3. Aapse confirm karunga before enabling.
4. Phir `payments--enable_stripe_payments` call karunga.
5. Aap test mode me product create karenge (Pro subscription, monthly/yearly).
6. Checkout session edge function + webhook handler implement karenge.

### Step 3: Subscription Flow
- "Upgrade to Pro" button → Pricing modal → Stripe Checkout
- On successful payment → webhook updates `novachat_settings.is_pro = true`, sets `pro_expires_at`
- Edge function reads `is_pro` to skip rate limit
- Account page me "Manage Subscription" → Stripe Customer Portal

---

## 🔒 Constraints Strictly Followed

| Constraint | How |
|---|---|
| Module Isolation | Sirf `src/components/novachat/*`, `src/hooks/useNovaChat.ts`, `supabase/functions/novachat-ai/`, naya migration |
| No backend exposure | LOVABLE_API_KEY edge function me hi rahega, frontend untouched |
| Dark + Light theme | Saare new components dono themes me tested |
| Mobile-first | Modals responsive, no horizontal scroll |
| No interstitial ads | Limit-reached modal is upgrade prompt, not ad |
| Existing features untouched | Chat history, attachments, voice, settings — koi change nahi |
| Realtime stability | No new realtime channels needed for this feature |

---

## 📦 Deliverables Order

1. **Migration**: `novachat_usage` table + RPC + `is_pro` columns
2. **Edge Function**: `novachat-ai` me rate limit check add
3. **Hook**: `useNovaUsage` + 429 handling in `useNovaChat`
4. **Components**: `LimitReachedModal`, `PricingModal`, sidebar usage indicator + Upgrade button
5. **Stripe enable** (with your confirmation): provider check → enable → product setup → checkout flow → webhook

---

## ❓ Final Confirmations Before Implementation

1. **Pro plan check**: Lovable Payments (Stripe) ke liye aap ka workspace **Pro plan** par hona chahiye. Confirm karein ki aap ke paas Pro plan hai?
2. **Pricing**: Pro tier ka monthly price kya rakhein? (e.g., $4.99/month, $9.99/month)
3. **Reset window**: Daily limit "midnight UTC" par reset ho ya "user ke local 24h se"? (Default suggestion: midnight UTC, simpler)

Plan approve karne ke baad main implementation start karunga — order strictly: Migration → Edge function → Frontend hooks → UI components → Stripe (last step).
