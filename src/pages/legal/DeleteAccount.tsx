import { Link } from "react-router-dom";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { SEO } from "@/components/seo/SEO";

const SUPPORT_EMAIL = "support@sha-verse.com";
const PRIVACY_EMAIL = "privacy@sha-verse.com";

/**
 * Public, login-free Account Deletion page.
 * Satisfies Google Play's Account Deletion policy: explains how to delete the
 * account, what data is removed, what is retained, and how to get help.
 * Content reflects the ACTUAL in-app behavior (DeleteAccountDialog +
 * the `delete-account` edge function) — no invented functionality.
 */
const DeleteAccount = () => {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Can I recover my deleted account?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Account deletion on Sha-Verse is permanent and immediate. There is no recovery period and the account cannot be restored once deletion is confirmed.",
        },
      },
      {
        "@type": "Question",
        name: "How long does deletion take?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Deletion happens immediately when you confirm. Your account, content, and files are removed right away, and you are signed out automatically.",
        },
      },
      {
        "@type": "Question",
        name: "What data is deleted?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Your profile and account details, posts, comments, likes and saved content, followers and following connections, messages and conversations, notifications, groups and group posts, uploaded files, images and videos, AI chat history, Bookshelf and Movion content, and your sign-in credentials.",
        },
      },
      {
        "@type": "Question",
        name: "Will my username become available again?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Because your profile is permanently removed, your username and profile details are no longer associated with your account after deletion.",
        },
      },
      {
        "@type": "Question",
        name: "Can I cancel deletion?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You can cancel before you confirm by closing the dialog. Once you tick the consent box, type DELETE, and confirm, the action runs immediately and cannot be cancelled or undone.",
        },
      },
      {
        "@type": "Question",
        name: "What happens to my posts and comments?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "All of your posts, comments, reactions and saved content are permanently deleted along with your account.",
        },
      },
      {
        "@type": "Question",
        name: "What happens to my messages?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Your messages and conversations are permanently removed from your account during deletion.",
        },
      },
      {
        "@type": "Question",
        name: "What happens if I signed in using Google?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The deletion process is the same regardless of how you signed in. Your authentication record, including a Google sign-in connection, is permanently removed.",
        },
      },
    ],
  };

  return (
    <>
      <SEO
        title="Delete Your Sha-Verse Account — Permanent Account Deletion"
        description="Learn how to permanently delete your Sha-Verse account and all associated data. Step-by-step instructions, what gets removed, and how to get help."
        path="/delete-account"
        jsonLd={faqJsonLd}
      />
      <LegalPageLayout title="Delete Your Sha-Verse Account" updated="June 26, 2026">
        <p>
          You can permanently delete your <strong>Sha-Verse</strong> account at any time, directly
          from within the app. This page explains exactly what happens when you delete your account,
          how to do it step by step, and how to get help if you need it.
        </p>

        <h2>What happens when you delete your account</h2>
        <p>
          Account deletion on Sha-Verse is <strong>permanent and immediate</strong>. There is no
          waiting period and no way to recover the account once deletion is confirmed. When you
          delete your account, the following data is permanently removed:
        </p>
        <ul>
          <li>Your profile, username and account details</li>
          <li>Your personal information (such as name, email, phone and profile picture)</li>
          <li>Posts, comments, likes, reactions and saved content</li>
          <li>Followers and following connections</li>
          <li>Messages and conversations</li>
          <li>Notifications</li>
          <li>Groups, group memberships and group posts</li>
          <li>Uploaded files, images and videos (storage cleanup)</li>
          <li>NovaChat AI chat history</li>
          <li>Bookshelf content</li>
          <li>Movion content</li>
          <li>
            Your authentication / sign-in credentials — including any Google sign-in connection
          </li>
        </ul>
        <p>
          We may retain a limited amount of information where we are legally required to (for
          example, to comply with legal, tax, fraud-prevention or security obligations). Any such
          data is kept only for as long as the law requires and is not used to re-create your
          account. See our <Link to="/privacy">Privacy Policy</Link> for details on data retention.
        </p>

        <h2>Before you delete</h2>
        <ul>
          <li>
            <strong>This action cannot be undone.</strong> Once confirmed, your account and data are
            removed immediately and cannot be restored.
          </li>
          <li>There is no grace period — deletion is instant.</li>
          <li>
            You will be signed out automatically and will lose access to all Sha-Verse features.
          </li>
          <li>
            If you only want a break, consider simply signing out instead of deleting your account.
          </li>
        </ul>

        <h2>How to delete your account</h2>
        <p>Follow these steps inside the Sha-Verse app or website:</p>
        <ol>
          <li>Open <strong>Sha-Verse</strong> and log in to your account.</li>
          <li>Open the <strong>Menu</strong>.</li>
          <li>Go to <strong>Settings &amp; Privacy</strong>.</li>
          <li>Open the <strong>Privacy Center</strong>.</li>
          <li>Tap <strong>Delete Account</strong>.</li>
          <li>Read the warning describing what will be removed.</li>
          <li>Tick the box to confirm you understand the action is permanent.</li>
          <li>
            Type <strong>DELETE</strong> in the confirmation field.
          </li>
          <li>
            Tap <strong>Delete Account</strong> to permanently delete your account.
          </li>
        </ol>
        <p>
          If you are already signed in, you can go straight to your{" "}
          <Link to="/privacy-center">Privacy Center</Link> to start the process.
        </p>

        <h2>Need help?</h2>
        <p>
          If you have trouble deleting your account or have questions about your data, our team is
          here to help:
        </p>
        <ul>
          <li>
            Support: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </li>
          <li>
            Privacy &amp; data requests: <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>
          </li>
          <li>
            Or visit our <Link to="/contact">Contact page</Link> or{" "}
            <Link to="/help">Help Center</Link>.
          </li>
        </ul>

        <h2>Frequently asked questions</h2>

        <h3>Can I recover my deleted account?</h3>
        <p>
          No. Deletion is permanent and immediate. There is no recovery period and the account
          cannot be restored once deletion is confirmed.
        </p>

        <h3>How long does deletion take?</h3>
        <p>
          Deletion happens immediately when you confirm. Your account, content and files are removed
          right away and you are signed out automatically.
        </p>

        <h3>What data is deleted?</h3>
        <p>
          Everything you own on Sha-Verse — your profile, posts, comments, messages, connections,
          uploaded media, AI chat history, Bookshelf and Movion content, and your sign-in
          credentials. See the full list above.
        </p>

        <h3>Will my username become available again?</h3>
        <p>
          Yes. Your profile is permanently removed, so your username and profile details are no
          longer associated with your account after deletion.
        </p>

        <h3>Can I cancel deletion?</h3>
        <p>
          You can cancel before confirming by closing the dialog. Once you tick the consent box,
          type <strong>DELETE</strong> and confirm, the action runs immediately and cannot be
          cancelled or undone.
        </p>

        <h3>What happens to my posts?</h3>
        <p>All of your posts, comments, reactions and saved content are permanently deleted.</p>

        <h3>What happens to messages?</h3>
        <p>
          Your messages and conversations are permanently removed from your account during deletion.
        </p>

        <h3>What happens if I signed in using Google?</h3>
        <p>
          The deletion process is the same no matter how you signed in. Your authentication record —
          including any Google sign-in connection — is permanently removed.
        </p>

        <h2>More information</h2>
        <ul>
          <li>
            <Link to="/privacy">Privacy Policy</Link>
          </li>
          <li>
            <Link to="/terms">Terms of Service</Link>
          </li>
          <li>
            <Link to="/help">Help Center</Link>
          </li>
          <li>
            <Link to="/contact">Contact &amp; Support</Link>
          </li>
        </ul>
      </LegalPageLayout>
    </>
  );
};

export default DeleteAccount;
