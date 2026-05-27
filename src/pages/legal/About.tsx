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
