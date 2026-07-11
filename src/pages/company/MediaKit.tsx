import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { SEO } from "@/components/seo/SEO";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { FAQSection } from "@/components/seo/FAQSection";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, type Crumb, type QA } from "@/lib/seo/structuredData";

const crumbs: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Media Kit", path: "/media-kit" },
];

const faqs: QA[] = [
  {
    q: "What is SHA-VERSE?",
    a: "SHA-VERSE is an independent technology company and a unified social universe — one mobile-first app that combines a social feed, long and short videos (Movion), an AI assistant (NovaChat), an EPUB/PDF reader (Bookshelf), and communities (Groups & Pages).",
  },
  {
    q: "Which platforms does SHA-VERSE run on?",
    a: "SHA-VERSE is available on the Web and as native mobile apps for Android and iOS.",
  },
  {
    q: "How can press or partners contact SHA-VERSE?",
    a: "Email hello@sha-verse.com for press, media, and partnership inquiries.",
  },
];

const Fact = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border bg-card p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm font-medium">{value}</p>
  </div>
);

const MediaKit = () => (
  <>
    <SEO
      title="Media Kit — SHA-VERSE"
      description="SHA-VERSE media kit: company overview, products, platforms, brand assets, and press contact. Everything needed to write about SHA-VERSE accurately."
      path="/media-kit"
      jsonLd={[buildBreadcrumbJsonLd(crumbs), buildFaqJsonLd(faqs)]}
    />
    <LegalPageLayout title="Media Kit">
      <Breadcrumbs items={crumbs} />

      <p>
        A quick reference for writing about <strong>SHA-VERSE</strong> accurately. Everything here is factual and
        current.
      </p>

      <h2>At a glance</h2>
      <div className="not-prose my-4 grid gap-3 sm:grid-cols-2">
        <Fact label="Official name" value="SHA-VERSE" />
        <Fact label="Category" value="Consumer technology / social ecosystem" />
        <Fact label="Platforms" value="Web, Android, iOS" />
        <Fact label="Pricing" value="Free (ad-supported)" />
        <Fact label="Slogan" value="Your Social Universe" />
        <Fact label="Contact" value="hello@sha-verse.com" />
      </div>

      <h2>What SHA-VERSE is</h2>
      <p>
        SHA-VERSE is an independent technology company and a unified social universe — one mobile-first app that combines
        a social feed, long and short videos, an AI assistant, an EPUB/PDF reader, and communities. It is not affiliated
        with any other project or organization using a similar name.
      </p>

      <h2>Products</h2>
      <ul>
        <li>
          <strong>Home Feed</strong> — posts, photos, polls, reactions, comments, and shares.
        </li>
        <li>
          <strong>Movion</strong> — long-form videos and short reels with creator monetization.
        </li>
        <li>
          <strong>NovaChat</strong> — the SHA-VERSE AI assistant.
        </li>
        <li>
          <strong>Bookshelf</strong> — an immersive EPUB and PDF reader with syncing bookmarks.
        </li>
        <li>
          <strong>Groups &amp; Pages</strong> — communities and creator pages.
        </li>
        <li>
          <strong>Chats</strong> — real-time messaging with read receipts and presence.
        </li>
      </ul>

      <h2>Brand assets</h2>
      <p>
        Logos, colors, and name-usage guidelines are on the{" "}
        <a href="/brand-assets">Brand Assets</a> page.
      </p>

      <h2>Press contact</h2>
      <p>
        For interviews, media, and partnership requests, email{" "}
        <a href="mailto:hello@sha-verse.com">hello@sha-verse.com</a>.
      </p>

      <FAQSection items={faqs} />
    </LegalPageLayout>
  </>
);

export default MediaKit;
