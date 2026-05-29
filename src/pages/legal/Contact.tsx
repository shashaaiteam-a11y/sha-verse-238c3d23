import { useState } from "react";
import { z } from "zod";
import { Mail, Send, CheckCircle2 } from "lucide-react";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  subject: z.string().trim().min(1, "Subject is required").max(150),
  message: z.string().trim().min(10, "Message is too short").max(2000),
});

const SUPPORT_EMAIL = "support@sha-verse.com";

const Contact = () => {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = contactSchema.safeParse({
      name: fd.get("name"),
      email: fd.get("email"),
      subject: fd.get("subject"),
      message: fd.get("message"),
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }

    setSubmitting(true);
    const { name, email, subject, message } = parsed.data;
    const body = encodeURIComponent(`From: ${name} <${email}>\n\n${message}`);
    const subj = encodeURIComponent(subject);
    // Open user's email client — privacy-first, no backend dependency.
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subj}&body=${body}`;
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 400);
  };

  return (
    <>
      <SEO
        title="Contact Sha-Verse — Support &amp; inquiries"
        description="Get in touch with the Sha-Verse team for support, bug reports, or business inquiries."
        path="/contact"
      />
    <LegalPageLayout title="Contact Us">
      <p>Questions, bug reports, business inquiries, or just want to say hi? We'd love to hear from you.</p>

      <div className="not-prose grid gap-3 sm:grid-cols-2 my-6">
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="flex items-center gap-3 rounded-lg border bg-card p-4 hover:bg-muted transition-colors"
        >
          <Mail className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">General & Support</p>
            <p className="text-sm font-medium truncate">{SUPPORT_EMAIL}</p>
          </div>
        </a>
        <a
          href="mailto:privacy@sha-verse.com"
          className="flex items-center gap-3 rounded-lg border bg-card p-4 hover:bg-muted transition-colors"
        >
          <Mail className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Privacy & Data Requests</p>
            <p className="text-sm font-medium truncate">privacy@sha-verse.com</p>
          </div>
        </a>
      </div>

      <h2>Send us a message</h2>

      {submitted ? (
        <div className="not-prose flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Your email client should be open now.</p>
            <p className="text-sm text-muted-foreground">
              If nothing happened, write to us directly at{" "}
              <a className="text-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="not-prose space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required maxLength={100} autoComplete="name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required maxLength={255} autoComplete="email" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" name="subject" required maxLength={150} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" name="message" required maxLength={2000} rows={6} />
          </div>
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            <Send className="h-4 w-4 mr-2" />
            {submitting ? "Opening…" : "Send message"}
          </Button>
        </form>
      )}
  );
};

export default Contact;
