import { Fragment } from "react";
import { Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { Crumb } from "@/lib/seo/structuredData";

/**
 * Visible breadcrumb trail. Pair with buildBreadcrumbJsonLd() passed to <SEO>
 * so the structured data matches what users see.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <Breadcrumb className="not-prose mb-5">
      <BreadcrumbList>
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <Fragment key={c.path}>
              <BreadcrumbItem>
                {last ? (
                  <BreadcrumbPage>{c.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={c.path}>{c.name}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!last && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
