import { source } from '@/lib/source';
import { notFound } from 'next/navigation';

export default async function Page(props: {
  params: Promise<{ slug: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <div className="flex-1 w-full max-w-3xl mx-auto px-6 py-12">
      <article className="prose prose-slate dark:prose-invert max-w-none
        prose-headings:text-foreground prose-headings:font-semibold
        prose-p:text-foreground prose-p:leading-relaxed
        prose-a:text-foreground prose-a:underline prose-a:underline-offset-4
        prose-a:decoration-foreground/40 hover:prose-a:decoration-foreground
        prose-code:text-foreground prose-code:bg-foreground/10 prose-code:rounded prose-code:px-1
        prose-pre:bg-foreground/5 prose-pre:border prose-pre:border-foreground/10
        prose-blockquote:border-foreground/30 prose-blockquote:text-foreground/70
        prose-strong:text-foreground prose-li:text-foreground">
        <MDX />
      </article>
    </div>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
