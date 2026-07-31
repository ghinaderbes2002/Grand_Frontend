import Link from "next/link";
import { notFound } from "next/navigation";

import { NoAccess } from "@/components/admin/no-access";
import { CategoryForm } from "@/components/admin/category-form";
import { getCategoryTree, listCategories } from "@/lib/api/catalog";
import type { CategoryTreeNode } from "@/lib/api/types";
import { PERMISSIONS, can } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function CategoriesPage({ params }: PageProps<"/[lang]/admin/categories">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const session = await requireSession(lang, `/${lang}/admin/categories`);

  if (!can(session, PERMISSIONS.categoriesCreate)) {
    return <NoAccess locale={lang} />;
  }

  const [tree, flat] = await Promise.all([getCategoryTree(), listCategories()]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h2 className="text-lg font-medium">{dict.admin.categories.title}</h2>
          <p className="text-muted text-sm">{dict.admin.categories.subtitle}</p>
        </header>

        {tree.length === 0 ? (
          <p className="text-muted text-sm">{dict.admin.empty}</p>
        ) : (
          <ul className="border-border divide-border divide-y rounded-xl border">
            {tree.map((node) => (
              <CategoryBranch key={node.id} node={node} locale={lang} depth={0} />
            ))}
          </ul>
        )}
      </section>

      <section className="border-border h-fit rounded-xl border p-5">
        <h2 className="mb-4 text-lg font-medium">{dict.admin.categories.newTitle}</h2>
        <CategoryForm
          parentOptions={flat.map((category) => ({
            id: category.id,
            label: category.path || category.name,
          }))}
        />
      </section>
    </div>
  );
}

function CategoryBranch({
  node,
  locale,
  depth,
}: {
  node: CategoryTreeNode;
  locale: Locale;
  depth: number;
}) {
  return (
    <>
      <li>
        <Link
          href={`/${locale}/admin/categories/${node.id}`}
          className="hover:bg-surface flex items-center justify-between gap-3 px-4 py-2.5 transition"
          // Logical padding so the indent flips with the writing direction.
          style={{ paddingInlineStart: `${16 + depth * 20}px` }}
        >
          <span className="flex items-center gap-2 text-sm">
            {depth > 0 ? <span className="text-muted">└</span> : null}
            <span className={node.isActive ? "" : "text-muted line-through"}>
              {node.name}
            </span>
          </span>
          <span className="text-muted font-mono text-xs">{node.slug}</span>
        </Link>
      </li>
      {node.children.map((child) => (
        <CategoryBranch key={child.id} node={child} locale={locale} depth={depth + 1} />
      ))}
    </>
  );
}
