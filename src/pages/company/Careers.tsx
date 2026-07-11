import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { SEO } from "@/components/seo/SEO";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { buildBreadcrumbJsonLd, type Crumb } from "@/lib/seo/structuredData";

const crumbs: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Careers", path: "/careers" },
];

const Careers = () => (
  <>
    <SEO
      title="Careers — SHA-VERSE"
      description="Careers at SHA-VERSE. There are no open roles right now — reach out to express interest in joining the team."
      path="/careers"
      noindex
      jsonLd={buildBreadcrumbJsonLd(crumbs)}
    />
    <LegalPageLayout title="Careers">
      <Breadcrumbs items={crumbs} />

      <p>
        There are no open roles at SHA-VERSE right now. When we start hiring, open positions will be listed on this page.
      </p>

      <h2>Interested in the future?</h2>
      <p>
        If you'd like to be considered when roles open up, email{" "}
        <a href="mailto:hello@sha-verse.com">hello@sha-verse.com</a> and tell us a little about yourself.
      </p>
    </LegalPageLayout>
  </>
);

export default Careers;
