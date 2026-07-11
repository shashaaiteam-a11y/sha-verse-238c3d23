import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { SEO } from "@/components/seo/SEO";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { FAQSection } from "@/components/seo/FAQSection";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, type Crumb, type QA } from "@/lib/seo/structuredData";

const crumbs: Crumb[] = [
  { name: "Home", path: "/" },
  { name: "Brand Assets", path: "/brand-assets" },
];

const faqs: QA[] = [
  {
    q: "How should the SHA-VERSE name be written?",
    a: "The official name is SHA-VERSE. Accepted written aliases are Sha-Verse and ShaVerse. Please keep the hyphen and do not write it as two separate words in body copy.",
  },
  {
    q: "Can I use the SHA-VERSE logo?",
    a: "You may use the SHA-VERSE logo to reference or link to SHA-VERSE. Do not stretch, recolor, or alter the logo, and do not use it in a way that implies partnership or endorsement without permission.",
  },
  {
    q: "What are the SHA-VERSE brand colors?",
    a: "The primary brand blue is #2563EB and the dark brand blue is #1E3A8A.",
  },
];

const Swatch = ({ hex, name }: { hex: string; name: string }) => (
  <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
    <span className="h-10 w-10 shrink-0 rounded-md border" style={{ backgroundColor: hex }} aria-hidden="true" />
    <div className="min-w-0">
      <p className="text-sm font-medium">{name}</p>
      <p className="text-xs text-muted-foreground">{hex}</p>
    </div>
  </div>
);

const BrandAssets = () => (
  <>
    <SEO
      title="Brand Assets — SHA-VERSE"
      description="Official SHA-VERSE brand assets: logo downloads, correct name usage, and brand colors. Guidelines for referencing the SHA-VERSE brand."
      path="/brand-assets"
      jsonLd={[buildBreadcrumbJsonLd(crumbs), buildFaqJsonLd(faqs)]}
    />
    <LegalPageLayout title="Brand Assets">
      <Breadcrumbs items={crumbs} />

      <p>
        These are the official assets and guidelines for referencing the <strong>SHA-VERSE</strong> brand. Please follow
        them so SHA-VERSE is represented consistently everywhere.
      </p>

      <h2>Name usage</h2>
      <ul>
        <li>
          Official name: <strong>SHA-VERSE</strong>.
        </li>
        <li>Accepted aliases: Sha-Verse, ShaVerse.</li>
        <li>Always keep the hyphen. Avoid writing it as two separate words.</li>
      </ul>

      <h2>Logo</h2>
      <p>Download the official logo. Do not alter, recolor, or distort it.</p>
      <div className="not-prose my-4 flex flex-wrap gap-3">
        <a
          href="/sha-verse-logo.jpeg"
          download
          className="inline-flex items-center rounded-md border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Logo (JPEG)
        </a>
        <a
          href="/icons/icon-512x512.png"
          download
          className="inline-flex items-center rounded-md border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          App icon (512×512 PNG)
        </a>
      </div>

      <h2>Colors</h2>
      <div className="not-prose my-4 grid gap-3 sm:grid-cols-2">
        <Swatch hex="#2563EB" name="Primary Blue" />
        <Swatch hex="#1E3A8A" name="Dark Blue" />
      </div>

      <h2>Do &amp; don't</h2>
      <ul>
        <li>Do use the assets to link to or reference SHA-VERSE.</li>
        <li>Don't imply partnership, sponsorship, or endorsement without written permission.</li>
        <li>Don't modify the logo's proportions, colors, or spacing.</li>
      </ul>

      <p>
        For brand or media questions, email{" "}
        <a href="mailto:hello@sha-verse.com">hello@sha-verse.com</a>.
      </p>

      <FAQSection items={faqs} />
    </LegalPageLayout>
  </>
);

export default BrandAssets;
