import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { SEO } from "@/components/seo/SEO";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { buildBreadcrumbJsonLd, type Crumb } from "@/lib/seo/structuredData";

const crumbs: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Developers", path: "/developers" },
];

const Developers = () => (
  <>
    <SEO
      title="Developers — SHA-VERSE"
      description="Developer information for SHA-VERSE. A public developer platform and API are not yet available."
      path="/developers"
      noindex
      jsonLd={buildBreadcrumbJsonLd(crumbs)}
    />
    <LegalPageLayout title="Developers">
      <Breadcrumbs items={crumbs} />

      <p>
        SHA-VERSE does not offer a public API or developer platform yet. When developer tools become available, the
        documentation will live here.
      </p>

      <h2>Stay in the loop</h2>
      <p>
        If you're a developer interested in building with SHA-VERSE, email{" "}
        <a href="mailto:hello@sha-verse.com">hello@sha-verse.com</a> and we'll keep you posted.
      </p>
    </LegalPageLayout>
  </>
);

export default Developers;
