import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { SEO } from "@/components/seo/SEO";

const Privacy = () => (
  <>
    <SEO
      title="Privacy Policy — Sha-Verse"
      description="How Sha-Verse collects, uses, stores, and protects your data — including account info, content, ads, AI features, and your rights."
      path="/privacy"
    />
    <LegalPageLayout title="Privacy Policy" updated="May 2, 2026">
    <p>
      Sha-Verse ("we", "us", "our") operates the website <strong>sha-verse.com</strong> and the Sha-Verse mobile
      application (collectively, the "Service"). This Privacy Policy explains what data we collect, how we use it, and
      your rights.
    </p>

    <h2>1. Information We Collect</h2>
    <ul>
      <li>
        <strong>Account data:</strong> name, email, phone, profile picture, date of birth.
      </li>
      <li>
        <strong>Authentication data:</strong> we receive basic profile information (such as name, email, and profile
        picture) from the provider.
      </li>
      <li>
        <strong>User content:</strong> posts, comments, reactions, stories, messages, books, videos and other content
        you upload.
      </li>
      <li>
        <strong>Usage data:</strong> pages viewed, features used, device type, OS, browser, IP address (anonymized for
        analytics), approximate location.
      </li>
      <li>
        <strong>Cookies & local storage:</strong> session tokens, theme preference, ad-frequency caps, consent choice.
      </li>
    </ul>

    <h2>2. How We Use Your Information</h2>
    <ul>
      <li>Provide and maintain the Service (feed, chat, NovaChat AI, Bookshelf, Groups, Profile).</li>
      <li>Authenticate you and keep your account secure.</li>
      <li>Personalize content and recommendations.</li>
      <li>Show ads (AdMob in the app, Google AdSense on the web) and measure ad performance.</li>
      <li>Detect abuse, fraud, and policy violations.</li>
      <li>Communicate service updates and respond to support requests.</li>
    </ul>

    <h2>3. Advertising</h2>
    <p>
      We use <bold>Mediation setup</bold> on our mobile app and website. These
      services may use cookies, advertising IDs, and similar identifiers to serve personalized ads.
    </p>
    <p>You can opt out of personalized ads:</p>
    <ul>
        </a>
    </ul>

    <h2>4. AI Features (NovaChat)</h2>
    <p>
      NovaChat uses advanced AI technology by Sha-Verse to generate responses. Your inputs may be processed to improve
      results. Do not share sensitive personal information, passwords, or financial details while using NovaChat. AI
      responses may not always be accurate.
    </p>

    <h2>5. Data Storage & Security</h2>
    <p>
      Your data is stored on Lovable Cloud (powered by Supabase) with industry-standard encryption in transit
      (HTTPS/TLS) and at rest. Row-Level Security policies restrict access to your own data. We do not sell your
      personal data to third parties. However, we may share limited data with trusted partners (such as advertising and
      analytics providers) to operate and improve our services.
    </p>

    <h2>6. Sharing of Information</h2>
    <p>We share data only with:</p>
    <ul>
      <li>
        <strong>Service providers</strong> (cloud hosting, analytics, ad networks, AI providers) bound by contracts.
      </li>
      <li>
        <strong>Legal authorities</strong> when required by law or to protect rights and safety.
      </li>
      <li>
        <strong>Other users</strong>, but only the content you publicly post (posts, profile, comments).
      </li>
    </ul>

    <h2>7. Your Rights</h2>
    <p>
      You can access, edit, or delete your account and content from <strong>Settings</strong> or the{" "}
      <a href="/privacy-center">Privacy Center</a>. EU/UK residents have additional rights under GDPR (access,
      portability, erasure, objection). India residents have rights under the DPDP Act 2023. Email{" "}
      <a href="mailto:privacy@sha-verse.com">privacy@sha-verse.com</a>
      to exercise these rights.
    </p>

    <h2>8. Children's Privacy</h2>
    <p>Sha-Verse is not intended for children under 13 (or the minimum age required in your country).</p>

    <h2>9. International Transfers</h2>
    <p>We ensure appropriate technical and legal safeguards are in place to protect your data during such transfers.</p>

    <h2>10. Changes to This Policy</h2>
    <p>
      We may update this Policy. Material changes will be notified via the app or email. Continued use after changes
      means acceptance of the updated Policy.
    </p>

    <h2>11. Contact</h2>
    <p>
      Email: <a href="mailto:privacy@sha-verse.com">privacy@sha-verse.com</a>
      <br />
      Website: <a href="/contact">/contact</a>
    </p>

    <h2>12. Data Retention</h2>
    <p>
      We retain your data only as long as necessary to provide our services and comply with legal obligations. You may
      request deletion of your data at any time.
    </p>

    <h2>13. Consent</h2>
    <p>
      By using Sha-Verse, you consent to the collection and use of your information as described in this Privacy Policy.
    </p>

    <h2>14. Cookies & Consent</h2>
    <p>
      We use cookies and similar technologies to enhance your experience. Where required, we will request your consent
      before using non-essential cookies. You can control your preferences through your browser settings.
    </p>
  </LegalPageLayout>
  </>
);

export default Privacy;
