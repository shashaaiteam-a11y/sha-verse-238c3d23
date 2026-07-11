import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { SEO } from "@/components/seo/SEO";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { FAQSection } from "@/components/seo/FAQSection";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, type Crumb, type QA } from "@/lib/seo/structuredData";

const crumbs: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Mission", path: "/mission" },
];

const faqs: QA[] = [
  {
    q: "What is SHA-VERSE's mission?",
    a: "SHA-VERSE's mission is to build a respectful, ad-supported social platform where creators earn fairly, people keep control of their data, and AI makes everyday tasks easier — without paywalls or subscriptions.",
  },
  {
    q: "Is SHA-VERSE free to use?",
    a: "Yes. SHA-VERSE is free. It is sustained through advertising rather than paywalls or subscriptions.",
  },
  {
    q: "How does SHA-VERSE treat user data?",
    a: "SHA-VERSE does not sell your personal data to third parties. Users keep control of their data, and ads may be personalized by partners such as Google.",
  },
];

const Mission = () => (
  <>
    <SEO
      title="Our Mission — SHA-VERSE"
      description="SHA-VERSE's mission: a respectful, ad-supported social platform where creators earn fairly, users control their data, and AI helps everyday tasks — with no paywalls."
      path="/mission"
      jsonLd={[buildBreadcrumbJsonLd(crumbs), buildFaqJsonLd(faqs)]}
    />
    <LegalPageLayout title="Our Mission">
      <Breadcrumbs items={crumbs} />

      <p>
        <strong>SHA-VERSE</strong> exists to bring the things people do online every day — connecting, watching,
        reading, asking, and belonging — into one respectful, unified home.
      </p>

      <h2>What we're building toward</h2>
      <p>
        Our mission is to build a respectful, ad-supported social platform where creators earn fairly, users keep
        control of their data, and AI makes everyday tasks easier — without locking anyone behind a paywall or a
        subscription.
      </p>

      <h2>The principles behind it</h2>
      <ul>
        <li>
          <strong>Creators first.</strong> The people who make content should share in the value they create.
        </li>
        <li>
          <strong>User control.</strong> People own what they post and keep control of their data. We do not sell
          personal data to third parties.
        </li>
        <li>
          <strong>Access for everyone.</strong> SHA-VERSE is free and sustained by advertising — no paywalls, no
          subscriptions.
        </li>
        <li>
          <strong>Useful AI.</strong> AI should quietly remove friction from everyday tasks, not get in the way.
        </li>
      </ul>

      <FAQSection items={faqs} />
    </LegalPageLayout>
  </>
);

export default Mission;
