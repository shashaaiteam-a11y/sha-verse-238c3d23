import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Zap,
  Users,
  BadgeCheck,
  Headphones,
  Mail,
  MessageCircle,
  Megaphone,
  Image as ImageIcon,
  CreditCard,
  Rocket,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CONTACT_EMAIL = 'shashaaiteam@gmail.com';

interface PriceRow {
  hours: number;
  price: string;
  original: string;
}

// INR: discounted = hours*250 - 0.01 ; original = hours*500
const inrRows: PriceRow[] = Array.from({ length: 24 }, (_, i) => {
  const hours = i + 1;
  return {
    hours,
    price: `₹${(hours * 250 - 0.01).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    original: `₹${(hours * 500).toLocaleString('en-IN')}`,
  };
});

// USD: discounted = hours*3 - 0.01 ; original = hours*6 - 0.01
const usdRows: PriceRow[] = Array.from({ length: 24 }, (_, i) => {
  const hours = i + 1;
  return {
    hours,
    price: `$${(hours * 3 - 0.01).toFixed(2)}`,
    original: `$${(hours * 6 - 0.01).toFixed(2)}`,
  };
});

const trustItems = [
  { icon: ShieldCheck, text: '100% Secure Payment' },
  { icon: Zap, text: 'Instant Approval in 30 mins' },
  { icon: Users, text: '50,000+ Active Users' },
  { icon: BadgeCheck, text: 'Money-back if not delivered' },
  { icon: Headphones, text: '24/7 Support' },
];

const steps = [
  {
    icon: ImageIcon,
    title: 'Send your creative',
    desc: 'Share your image or video (15 sec – 5 min) and the link you want to promote.',
  },
  {
    icon: CreditCard,
    title: 'Pick duration & pay',
    desc: 'Choose how many hours your promotion runs, then pay securely.',
  },
  {
    icon: Rocket,
    title: 'Go live instantly',
    desc: 'Your promotion appears as a status on the Sha-Verse logo for everyone.',
  },
];

const PriceTable = ({ title, subtitle, rows }: { title: string; subtitle: string; rows: PriceRow[] }) => (
  <div className="rounded-2xl border border-border bg-card overflow-hidden">
    <div className="px-4 py-3 border-b border-border">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
    <div className="divide-y divide-border">
      {rows.map((r) => (
        <div key={r.hours} className="flex items-center justify-between px-4 py-2.5">
          <span className="text-sm font-medium text-foreground">
            {r.hours} {r.hours === 1 ? 'hour' : 'hours'}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground tabular-nums">{r.price}</span>
            <span className="text-xs text-muted-foreground line-through tabular-nums">{r.original}</span>
            <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
              50% off
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const PromoteInfo = () => {
  const navigate = useNavigate();
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');

  return (
    <div
      className="min-h-screen bg-background overflow-y-auto"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
      }}
    >
      {/* Standalone header with own back button */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 h-14 bg-background/95 backdrop-blur border-b border-border"
        style={{ top: 'env(safe-area-inset-top, 0px)' }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">Promote on Sha-Verse</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 space-y-8 pt-6">
        {/* Hero */}
        <section className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary">
            <Megaphone className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Promote on Sha-Verse</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Reach thousands of active users instantly. Your promotion shows up as a featured
            status on the Sha-Verse logo, seen by the whole community.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {trustItems.slice(0, 3).map(({ icon: Icon, text }) => (
              <span
                key={text}
                className="inline-flex items-center gap-1.5 text-xs font-medium bg-muted px-2.5 py-1 rounded-full text-foreground"
              >
                <Icon className="w-3.5 h-3.5 text-primary" /> {text}
              </span>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">How it works</h3>
          <div className="grid gap-3">
            {steps.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {i + 1}. {title}
                  </p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Pricing</h3>
            <div className="inline-flex rounded-full bg-muted p-0.5">
              {(['INR', 'USD'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  className={cn(
                    'px-3 py-1 text-xs font-semibold rounded-full transition-colors',
                    currency === c
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {c === 'INR' ? '🇮🇳 India' : '🌍 International'}
                </button>
              ))}
            </div>
          </div>

          {currency === 'INR' ? (
            <PriceTable
              title="India (INR)"
              subtitle="+18% GST extra · 50% launch discount applied"
              rows={inrRows}
            />
          ) : (
            <PriceTable
              title="International (USD)"
              subtitle="No tax · 50% launch discount applied"
              rows={usdRows}
            />
          )}
        </section>

        {/* Contact */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Get started / Contact us</h3>
          <p className="text-sm text-muted-foreground">
            Ready to promote? Reach out and our team will set you up within 30 minutes.
          </p>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => {
                window.location.href = `mailto:${CONTACT_EMAIL}?subject=Promotion%20on%20Sha-Verse`;
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left hover:bg-muted/60 transition-colors"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Email us instantly</p>
                <p className="text-xs text-muted-foreground truncate">{CONTACT_EMAIL}</p>
              </div>
            </button>
          </div>
        </section>

        {/* Trust */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Why advertise with us</h3>
          <div className="grid gap-2">
            {trustItems.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 rounded-xl bg-card border border-border p-3">
                <Icon className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm text-foreground">{text}</span>
              </div>
            ))}
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground pt-2">
          Prices shown include a 50% launch discount. Final amount confirmed at checkout.
        </p>
      </main>
    </div>
  );
};

export default PromoteInfo;
