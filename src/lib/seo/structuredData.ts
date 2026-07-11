const SITE_URL = "https://www.sha-verse.com";

const abs = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

export interface Crumb {
  name: string;
  path: string;
}

/** BreadcrumbList JSON-LD matching a visible breadcrumb trail. */
export function buildBreadcrumbJsonLd(items: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: abs(c.path),
    })),
  };
}

export interface QA {
  q: string;
  a: string;
}

/** FAQPage JSON-LD matching a visible FAQ section. Use accurate answers only. */
export function buildFaqJsonLd(items: QA[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };
}
