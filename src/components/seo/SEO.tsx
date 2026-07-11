import { Helmet } from "react-helmet-async";

const SITE_URL = "https://www.sha-verse.com";

interface SEOProps {
  title: string;
  description: string;
  path: string; // e.g. "/about"
  jsonLd?: object | object[];
  /**
   * When true, adds `<meta name="robots" content="noindex, follow">` so the
   * page is reachable by users but kept out of search indexes until its
   * content is finished. Links are still followed for crawl discovery.
   */
  noindex?: boolean;
}

/**
 * Per-route SEO head tags. Sets <title>, meta description, canonical,
 * and og:* / twitter:* overrides. Optional JSON-LD blocks accepted.
 */
export function SEO({ title, description, path, jsonLd, noindex }: SEOProps) {
  const url = `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex, follow" />}
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {blocks.map((b, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(b)}
        </script>
      ))}
    </Helmet>
  );
}
