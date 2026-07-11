import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { SEO } from "@/components/seo/SEO";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { buildBreadcrumbJsonLd, type Crumb } from "@/lib/seo/structuredData";

const crumbs: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "News", path: "/news" },
];

const News = () => (
  <>
    <SEO
      title="News — SHA-VERSE"
      description="Product news and updates from SHA-VERSE."
      path="/news"
      noindex
      jsonLd={buildBreadcrumbJsonLd(crumbs)}
    />
    <LegalPageLayout title="News">
      <Breadcrumbs items={crumbs} />

      <p>
        There are no news posts yet. Product updates and announcements from SHA-VERSE will be published here.
      </p>

      <p>
        In the meantime, learn more about our{" "}
        <a href="/mission">mission</a> and <a href="/vision">vision</a>, or reach us on the{" "}
        <a href="/contact">Contact</a> page.
      </p>
    </LegalPageLayout>
  </>
);

export default News;
