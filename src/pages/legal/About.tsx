import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { SEO } from "@/components/seo/SEO";

const About = () => (
  <>
    <SEO
      title="About Sha-Verse — One app for social, video, AI, books"
      description="Sha-Verse is a unified social universe combining a feed, Movion videos, NovaChat AI, Bookshelf reader, and communities — all in one mobile-first app."
      path="/about"
    />
    <LegalPageLayout title="About Sha-Verse">
      <p>
        <strong>Sha-Verse</strong> is a unified social universe — one app that brings together everything you love about
        the internet. No more switching between five different apps.
      </p>

      <h2>What's inside</h2>
      <ul>
        <li>
          <strong>Home Feed</strong> — posts, photos, polls, reactions, comments, shares.
        </li>
        <li>
          <strong>Movion</strong> — long-form videos and short reels with creator monetization.
        </li>
        <li>
          <strong>NovaChat</strong> — NovaChat is Sha-Verse’s AI assistant, powered by advanced language models such as
          Google Gemini via secure API integrations.
        </li>
        <li>
          <strong>Bookshelf</strong> — read EPUB and PDF books with an immersive zoom reader and bookmarks that sync
          across devices.
        </li>
        <li>
          <strong>Groups</strong> — communities around the topics you care about.
        </li>
        <li>
          <strong>Pages</strong> — Sha-Verse Creators &amp; Pages.
        </li>
        <li>
          <strong>Chats</strong> — Real-time messaging with read receipts and presence.
        </li>
        <li>
          <strong>Profile</strong> — your home base for friends, photos, and everything you've shared.
        </li>
      </ul>

      <h2>Our mission</h2>
      <p>
        To build a respectful, ad-supported social platform where creators earn fairly, users keep control of their data,
        and AI makes everyday tasks easier — without locking anyone behind a paywall &amp; subscriptions.
      </p>

      <h2>How we make money</h2>
      <p>
        Sha-Verse is free. We sustain the platform through Google AdMob (in the app) and Google AdSense (on the web). We
        do not sell your personal data to third parties. Ads may be personalized by our partners like Google.
      </p>

      <h2>Built with</h2>
      <p>
        React, TypeScript, Tailwind, Capacitor for native apps, and a cloud backend powered by Supabase. AI features are
        integrated through secure API services.
      </p>

      <h2>Get in touch</h2>
      <p>
        Visit our <a href="/contact">Contact page</a> or email{" "}
        <a href="mailto:hello@sha-verse.com">hello@sha-verse.com</a>.
      </p>
    </LegalPageLayout>
  </>
);

export default About;
