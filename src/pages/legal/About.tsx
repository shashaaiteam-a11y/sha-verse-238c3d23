import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

const About = () => (
  <LegalPageLayout title="About Sha-Verse">
    <p>
      <strong>Sha-Verse</strong> is a unified social universe — one app that brings together
      everything you love about the internet. No more switching between five different apps.
    </p>

    <h2>What's inside</h2>
    <ul>
      <li><strong>Home Feed</strong> — posts, photos, polls, reactions, comments, shares.</li>
      <li><strong>Movion</strong> — long-form videos and short reels with creator monetization.</li>
      <li><strong>NovaChat</strong> — a smart AI assistant powered by Google Gemini.</li>
      <li><strong>Bookshelf</strong> — read EPUB and PDF books with an immersive zoom reader and bookmarks that sync across devices.</li>
      <li><strong>Groups</strong> — communities around the topics you care about.</li>
      <li><strong>Pages</strong> — Facebook-style brand and creator pages.</li>
      <li><strong>Chats</strong> — WhatsApp-style messaging with read receipts and presence.</li>
      <li><strong>Profile</strong> — your home base for friends, photos, and everything you've shared.</li>
    </ul>

    <h2>Our mission</h2>
    <p>
      To build a respectful, ad-supported social platform where creators earn fairly, users
      keep control of their data, and AI makes everyday tasks easier — without locking anyone
      behind a paywall.
    </p>

    <h2>How we make money</h2>
    <p>
      Sha-Verse is free. We sustain the platform through Google AdMob (in the app) and Google
      AdSense (on the web). We never sell your personal data.
    </p>

    <h2>Built with</h2>
    <p>
      React, TypeScript, Tailwind, Capacitor for native, and Lovable Cloud (powered by
      Supabase) for our backend. AI features are powered by Google Gemini via the Lovable AI
      Gateway.
    </p>

    <h2>Get in touch</h2>
    <p>
      Visit our <a href="/contact">Contact page</a> or email{" "}
      <a href="mailto:hello@sha-verse.com">hello@sha-verse.com</a>.
    </p>
  </LegalPageLayout>
);

export default About;
