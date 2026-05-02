import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface Props {
  title: string;
  updated?: string;
  children: React.ReactNode;
}

export const LegalPageLayout = ({ title, updated, children }: Props) => {
  return (
    <div className="min-h-screen bg-background safe-top">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link
            to="/"
            aria-label="Back to home"
            className="touch-target inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold sm:text-xl">{title}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 pb-24">
        {updated && (
          <p className="mb-6 text-xs text-muted-foreground">Last updated: {updated}</p>
        )}
        <article className="prose prose-sm sm:prose-base max-w-none dark:prose-invert prose-headings:scroll-mt-20 prose-headings:font-semibold prose-a:text-primary">
          {children}
        </article>
      </main>
    </div>
  );
};
