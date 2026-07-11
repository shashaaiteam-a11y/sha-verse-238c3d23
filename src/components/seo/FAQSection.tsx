import type { QA } from "@/lib/seo/structuredData";

/**
 * Visible FAQ section. Pair with buildFaqJsonLd() passed to <SEO> so the
 * FAQPage structured data matches the on-page questions and answers.
 * Designed to render inside the `prose` article of LegalPageLayout.
 */
export function FAQSection({ items, heading = "Frequently asked questions" }: { items: QA[]; heading?: string }) {
  return (
    <section aria-label={heading}>
      <h2>{heading}</h2>
      {items.map((f) => (
        <div key={f.q}>
          <h3>{f.q}</h3>
          <p>{f.a}</p>
        </div>
      ))}
    </section>
  );
}
