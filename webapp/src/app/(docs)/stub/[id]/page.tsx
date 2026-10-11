import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import terminology from '../../../../../.source/terminology.json';
import type { TerminologyIndex } from '@/lib/terminology';

const concepts: TerminologyIndex = terminology;
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(concepts).map(id => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const concept = concepts[id];
  if (!concept) notFound();
  return { title: concept.label, robots: { index: false, follow: true } };
}

export default async function ConceptStub({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const concept = concepts[id];
  if (!concept) notFound();
  if (concept.article) permanentRedirect(concept.article);

  return (
    <article className="flex-1 w-full max-w-3xl mx-auto px-6 py-12 prose prose-slate dark:prose-invert">
      <h1>{concept.label}</h1>
      <p>Article pending. ThaiOML has not yet published an article for this concept.</p>
      <p>SNOMED CT concept ID: {concept.id}</p>
      <h2>Referenced in the library</h2>
      <ul>
        {concept.references.map(reference => (
          <li key={reference.url}><Link href={reference.url}>{reference.title}</Link></li>
        ))}
      </ul>
    </article>
  );
}
