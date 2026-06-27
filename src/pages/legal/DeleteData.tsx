import { Link } from "react-router-dom";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { SEO } from "@/components/seo/SEO";

const SUPPORT_EMAIL = "support@sha-verse.com";
const PRIVACY_EMAIL = "privacy@sha-verse.com";

/**
 * Public, login-free "Delete Your Data" page.
 *
 * Distinct from /delete-account: this explains how a user can permanently
 * delete individual pieces of their OWN content while KEEPING their account.
 * Content reflects the actual in-app delete options (posts, comments,
 * profile fields, books, groups, chats, AI history, etc.) — no invented
 * functionality. Only the owner can delete their own content.
 */
const DeleteData = () => {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Can I delete my posts?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Open the post you created, tap the menu (three dots) and choose Delete. The post and any attached images or videos are permanently removed.",
        },
      },
      {
        "@type": "Question",
        name: "Can I delete my chats?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. In a conversation you can delete your own messages, and you can delete an entire conversation from your chat list. Media you shared is removed with the message.",
        },
      },
      {
        "@type": "Question",
        name: "Can I delete my AI chat history?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. In NovaChat you can delete individual conversations or clear your history. Deleted AI conversations and prompts cannot be recovered.",
        },
      },
      {
        "@type": "Question",
        name: "Can I delete books I uploaded?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Open the book you own from the Bookshelf, open its options and choose Delete. The book, its cover and chapters are permanently removed.",
        },
      },
      {
        "@type": "Question",
        name: "Can I recover deleted data?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Deleting content is permanent. Once you confirm a deletion it cannot be undone or restored.",
        },
      },
      {
        "@type": "Question",
        name: "Can someone else delete my data?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Only the owner of a piece of content can delete it. You cannot delete content created by other users, and they cannot delete yours.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need to delete my account to delete my data?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. You can delete individual content while keeping your account. Deleting your account is a separate action available on the Delete Account page.",
        },
      },
      {
        "@type": "Question",
        name: "What information may be retained?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "After deletion, content is removed from the app. A limited amount of information may be retained only where required by law or for fraud prevention, abuse prevention, security investigations or dispute resolution. Retained information is not publicly visible.",
        },
      },
    ],
  };

  return (
    <>
      <SEO
        title="Delete Your Data — Remove Your Content on Sha-Verse"
        description="Learn how to permanently delete your own content on Sha-Verse without deleting your account — posts, comments, books, chats, AI history, media and more."
        path="/delete-data"
        jsonLd={faqJsonLd}
      />
      <LegalPageLayout title="Delete Your Data" updated="June 27, 2026">
        <p>
          This page explains how <strong>Sha-Verse</strong> users can permanently delete their own
          content <strong>without deleting their account</strong>. You remain in control of the
          information you create and can remove eligible content directly from inside the app.
        </p>

        <h2>Introduction</h2>
        <ul>
          <li>You do <strong>not</strong> need to delete your account to delete individual content.</li>
          <li>
            Most user-created content can be permanently removed directly from within the Sha-Verse
            app.
          </li>
          <li>
            Deletion is performed inside the app using the delete option available for each feature.
          </li>
          <li>
            <strong>Only the owner</strong> of a piece of content can delete it. You cannot delete
            content owned by other users.
          </li>
        </ul>

        <h2>What you can delete</h2>

        <h3>Profile information</h3>
        <p>
          Profile photo, profile banner, display name, bio, profile links and custom profile
          details. <em>Who can delete: only you, the account owner.</em>
        </p>
        <ol>
          <li>Open <strong>Sha-Verse</strong> and go to your <strong>Profile</strong>.</li>
          <li>Tap <strong>Edit Profile</strong>.</li>
          <li>Remove the photo, banner, bio or link, or clear the field you want to delete.</li>
          <li>Tap <strong>Save</strong>. The information is permanently removed.</li>
        </ol>
        <p>
          <strong>Recovery:</strong> Deleted profile details cannot be recovered. <strong>Retention:</strong>{" "}
          removed from the app, except limited data kept where legally required.
        </p>

        <h3>Posts &amp; attached media</h3>
        <p>
          Posts and the images, videos and attachments inside them. <em>Who can delete: only the
          post author.</em>
        </p>
        <ol>
          <li>Open the <strong>post</strong> you created.</li>
          <li>Tap the <strong>menu</strong> (three dots) on the post.</li>
          <li>Tap <strong>Delete</strong>.</li>
          <li>Confirm. The post and its attached media are permanently deleted.</li>
        </ol>
        <p>
          <strong>Recovery:</strong> Not recoverable — deletion is permanent. <strong>Retention:</strong>{" "}
          removed from the app, except limited data kept where legally required.
        </p>

        <h3>Comments &amp; replies</h3>
        <p>
          Comments and replies you posted. <em>Who can delete: only the comment author.</em>
        </p>
        <ol>
          <li>Find your <strong>comment</strong> or reply.</li>
          <li>Tap the <strong>menu</strong> next to it.</li>
          <li>Tap <strong>Delete</strong> and confirm.</li>
        </ol>
        <p>
          <strong>Recovery:</strong> Not recoverable. <strong>Retention:</strong> removed from the
          app, except limited data kept where legally required.
        </p>

        <h3>Likes, reactions &amp; saved items</h3>
        <p>
          Likes, reactions, saved posts and bookmarks. <em>Who can delete: only you.</em>
        </p>
        <ol>
          <li>To remove a reaction, open the item and tap your reaction again to remove it.</li>
          <li>To unsave, open <strong>Saved</strong>, find the item and tap <strong>Unsave</strong>.</li>
        </ol>
        <p>
          <strong>Recovery:</strong> Not recoverable — you can re-react or re-save later if you wish.
        </p>

        <h3>Books, covers &amp; chapters</h3>
        <p>
          Books you uploaded, their covers and chapters in the Bookshelf. <em>Who can delete: only
          the uploader.</em>
        </p>
        <ol>
          <li>Open <strong>Bookshelf</strong> and go to the <strong>book</strong> you uploaded.</li>
          <li>Open the book <strong>options</strong> (menu / edit).</li>
          <li>Tap <strong>Delete</strong> and confirm.</li>
        </ol>
        <p>
          <strong>Recovery:</strong> Not recoverable. <strong>Retention:</strong> removed from the
          app, except limited data kept where legally required.
        </p>

        <h3>AI chat conversations (NovaChat)</h3>
        <p>
          NovaChat conversations, your prompts and AI history. <em>Who can delete: only you.</em>
        </p>
        <ol>
          <li>Open <strong>NovaChat</strong>.</li>
          <li>Open the conversation list.</li>
          <li>Select a conversation and tap <strong>Delete</strong>, or clear your history.</li>
          <li>Confirm. The conversation and prompts are permanently removed.</li>
        </ol>
        <p>
          <strong>Recovery:</strong> Not recoverable. <strong>Retention:</strong> removed from the
          app, except limited data kept where legally required.
        </p>

        <h3>Private chat messages &amp; shared media</h3>
        <p>
          Messages you sent and media you shared in conversations. <em>Who can delete: only the
          sender for their own messages.</em>
        </p>
        <ol>
          <li>Open the <strong>conversation</strong>.</li>
          <li>Press and hold your <strong>message</strong>.</li>
          <li>Tap <strong>Delete</strong>, or delete the entire conversation from your chat list.</li>
        </ol>
        <p>
          <strong>Recovery:</strong> Not recoverable. <strong>Retention:</strong> removed from the
          app, except limited data kept where legally required.
        </p>

        <h3>Groups, group media &amp; group posts</h3>
        <p>
          Groups you created, group profile and cover images, group posts and group messages.{" "}
          <em>Who can delete: the group owner/admin for the group; each author for their own group
          posts and messages.</em>
        </p>
        <ol>
          <li>Open <strong>Groups</strong> and go to your group.</li>
          <li>
            For a group post or message: open its <strong>menu</strong> and tap <strong>Delete</strong>.
          </li>
          <li>
            To delete a group you own: open <strong>Group Admin</strong> settings and choose{" "}
            <strong>Delete Group</strong>.
          </li>
          <li>Confirm. The selected content is permanently deleted.</li>
        </ol>
        <p>
          <strong>Recovery:</strong> Not recoverable. <strong>Retention:</strong> removed from the
          app, except limited data kept where legally required.
        </p>

        <h3>Stories</h3>
        <p>
          Stories you posted. <em>Who can delete: only you.</em> Stories also expire automatically
          after 24 hours.
        </p>
        <ol>
          <li>Open your <strong>story</strong>.</li>
          <li>Tap the <strong>menu</strong> and choose <strong>Delete</strong>.</li>
        </ol>
        <p>
          <strong>Recovery:</strong> Not recoverable.
        </p>

        <h3>Notifications</h3>
        <p>
          Notifications in your activity list. <em>Who can delete: only you.</em>
        </p>
        <ol>
          <li>Open <strong>Notifications</strong>.</li>
          <li>Clear individual notifications or mark all as read where available.</li>
        </ol>
        <p>
          <strong>Recovery:</strong> Cleared notifications cannot be restored.
        </p>

        <h3>Uploaded files &amp; storage media</h3>
        <p>
          Files, images and videos you uploaded are removed when you delete the post, message, book,
          group content or profile item they belong to. <em>Who can delete: only you.</em> When you
          delete the parent item, its associated media is removed from storage.
        </p>
        <p>
          <strong>Recovery:</strong> Not recoverable.
        </p>

        <h2>Recovery</h2>
        <p>
          <strong>Deleted content cannot be recovered. Deletion is permanent.</strong> Once you
          confirm a deletion, the content is removed and cannot be restored. If you are unsure, make
          your own copy before deleting.
        </p>

        <h2>Data retention</h2>
        <p>
          Although deleted user content is removed from the application, certain limited information
          may be retained when required for:
        </p>
        <ul>
          <li>legal obligations</li>
          <li>fraud prevention</li>
          <li>abuse prevention</li>
          <li>security investigations</li>
          <li>dispute resolution</li>
          <li>regulatory compliance</li>
        </ul>
        <p>
          Only the minimum information required for these purposes may be retained, and the retained
          information is <strong>not publicly visible</strong>. See our{" "}
          <Link to="/privacy">Privacy Policy</Link> for details.
        </p>

        <h2>Deleting content vs deleting your account</h2>
        <p>
          Deleting content does <strong>not</strong> delete your account. Deleting your account is a
          separate process that permanently removes your profile and all of your content at once.
        </p>
        <p>
          <Link
            to="/delete-account"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground no-underline hover:opacity-90"
          >
            Go to Delete Account
          </Link>
        </p>

        <h2>Need help?</h2>
        <p>If you have trouble deleting your content or questions about your data, contact us:</p>
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

        <h3>Can I delete my posts?</h3>
        <p>
          Yes. Open a post you created, tap the menu and choose Delete. The post and its media are
          permanently removed.
        </p>

        <h3>Can I delete my chats?</h3>
        <p>
          Yes. You can delete your own messages inside a conversation and delete entire conversations
          from your chat list. Media you shared is removed with the message.
        </p>

        <h3>Can I delete AI history?</h3>
        <p>
          Yes. In NovaChat you can delete individual conversations or clear your history. Deleted AI
          conversations and prompts cannot be recovered.
        </p>

        <h3>Can I delete books?</h3>
        <p>
          Yes. Open a book you uploaded, open its options and choose Delete. The book, cover and
          chapters are permanently removed.
        </p>

        <h3>Can I delete videos?</h3>
        <p>
          Yes. Any video you uploaded is removed when you delete the post or content it is attached
          to. Only the owner can delete it.
        </p>

        <h3>Can I recover deleted data?</h3>
        <p>No. Deletion is permanent and cannot be undone.</p>

        <h3>Can someone else delete my data?</h3>
        <p>
          No. Only the owner of a piece of content can delete it. You cannot delete other users'
          content and they cannot delete yours.
        </p>

        <h3>Do I need to delete my account?</h3>
        <p>
          No. You can delete individual content while keeping your account. Deleting your account is
          a separate action on the <Link to="/delete-account">Delete Account</Link> page.
        </p>

        <h3>Does Sha-Verse keep backups?</h3>
        <p>
          Operational backups may exist for a limited period for security and reliability, but
          deleted content is not restored from them and is purged in the normal course. Limited data
          may be retained only where legally required.
        </p>

        <h3>What information may be retained?</h3>
        <p>
          Only the minimum information required for legal, fraud-prevention, abuse-prevention,
          security or dispute-resolution purposes. Retained information is not publicly visible.
        </p>

        <h3>Where do I delete my content?</h3>
        <p>
          Inside the Sha-Verse app, using the delete option for each feature as described above.
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
          <li>
            <Link to="/about">About Sha-Verse</Link>
          </li>
        </ul>
      </LegalPageLayout>
    </>
  );
};

export default DeleteData;
