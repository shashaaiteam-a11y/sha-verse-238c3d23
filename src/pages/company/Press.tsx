import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { SEO } from "@/components/seo/SEO";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { buildBreadcrumbJsonLd, type Crumb } from "@/lib/seo/structuredData";

const crumbs: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Press", path: "/press" },
];

const Press = () => (
  <>
    <SEO
      title="Press — SHA-VERSE"
      description="Press and media information for SHA-VERSE. For interviews and media inquiries, contact the SHA-VERSE team."
      path="/press"
      noindex
      jsonLd={buildBreadcrumbJsonLd(crumbs)}
    />
    <LegalPageLayout title="Press">
      <Breadcrumbs items={crumbs} />

      <p>
        There are no press releases published yet. As SHA-VERSE grows, official announcements and press releases will
        appear here.
      </p>

      <h2>Media inquiries</h2>
      <p>
        For interviews, statements, or media requests, email{" "}
        <a href="mailto:hello@sha-verse.com">hello@sha-verse.com</a>.
      </p>

      <h2>Looking for facts or assets?</h2>
      <p>
        See the <a href="/media-kit">Media Kit</a> for a company overview and the{" "}
        <a href="/brand-assets">Brand Assets</a> page for logos and colors.
      </p>
    </LegalPageLayout>
  </>
);

export default Press;
