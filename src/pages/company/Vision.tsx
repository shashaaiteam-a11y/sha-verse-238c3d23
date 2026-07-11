import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { SEO } from "@/components/seo/SEO";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { FAQSection } from "@/components/seo/FAQSection";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, type Crumb, type QA } from "@/lib/seo/structuredData";

const crumbs: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Vision", path: "/vision" },
];

const faqs: QA[] = [
  {
    q: "What is SHA-VERSE's vision?",
    a: "SHA-VERSE's vision is an independent technology company and social universe where feed, video, AI, reading, and community live together in one place — a single unified home for everything people do online.",
  },
  {
    q: "Is SHA-VERSE an independent company?",
    a: "Yes. SHA-VERSE is an independent technology company and social ecosystem, owned and operated as its own brand. It is not affiliated with any other project or organization using a similar name.",
  },
  {
    q: "What makes SHA-VERSE different from using several separate apps?",
    a: "SHA-VERSE unifies a social feed, Movion videos, NovaChat AI, a Bookshelf reader, and communities into one mobile-first app, so people don't have to switch between five different products.",
  },
];

const Vision = () => (
  <>
    <SEO
      title="Our Vision — SHA-VERSE"
      description="SHA-VERSE's vision: an independent technology company and unified social universe where feed, video, AI, reading, and community live together in one place."
      path="/vision"
      jsonLd={[buildBreadcrumbJsonLd(crumbs), buildFaqJsonLd(faqs)]}
    />
    <LegalPageLayout title="Our Vision">
      <Breadcrumbs items={crumbs} />

      <p>
        We believe the internet has become fragmented across too many separate apps. <strong>SHA-VERSE</strong> is our
        answer: one place for everything people do online.
      </p>

      <h2>Where we're headed</h2>
      <p>
        SHA-VERSE is building an independent technology company and social universe where feed, video, AI, reading, and
        community live together in one place — a single, unified home for everything people do online, owned and
        operated as its own brand rather than a feature of someone else's platform.
      </p>

      <h2>What that looks like</h2>
      <ul>
        <li>
          <strong>One unified experience</strong> instead of switching between separate social, video, AI, reading, and
          community apps.
        </li>
        <li>
          <strong>An independent brand</strong> — SHA-VERSE stands on its own, not as a feature of another company's
          product.
        </li>
        <li>
          <strong>Mobile-first and cross-platform</strong> — a native-quality experience on Web, Android, and iOS.
        </li>
      </ul>

      <FAQSection items={faqs} />
    </LegalPageLayout>
  </>
);

export default Vision;
