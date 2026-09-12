import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Script from 'next/script';
import * as cheerio from 'cheerio';

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

async function fetchMkdocsPage(slugArray?: string[]) {
  const path = slugArray ? slugArray.join('/') : '';
  
  // Silently ignore MkDocs livereload polling to prevent 404 console spam
  if (path.startsWith('livereload/')) {
    return null;
  }

  const siteUrl = process.env.DOCS_UPSTREAM_URL || 'http://localhost:8000';
  
  // Always append trailing slash for MkDocs if not empty, otherwise we hit redirects
  const url = `${siteUrl}/${path}${path ? '/' : ''}`;
  
  const res = await fetch(url, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    return null;
  }

  return res.text();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const html = await fetchMkdocsPage(slug);
  if (!html) return {};

  const $ = cheerio.load(html);
  return {
    title: $('title').text(),
    description: $('meta[name="description"]').attr('content'),
  };
}

export default async function MkDocsPage({ params }: PageProps) {
  const { slug } = await params;
  const html = await fetchMkdocsPage(slug);
  
  if (!html) {
    notFound();
  }

  const $ = cheerio.load(html);

  // Extract head links (CSS, preconnects, etc)
  const links: React.ReactNode[] = [];
  $('head link').each((i, el) => {
    const rel = $(el).attr('rel');
    const href = $(el).attr('href');
    if (rel === 'stylesheet') {
      // We purposefully DO NOT use precedence="default" here!
      // If hoisted to the <head>, MkDocs global CSS will bleed into native Next.js pages (like /) when navigating back.
      // By rendering it locally, React unmounts the CSS when this page unmounts. 
      // FOUC is prevented by the aggressive Cache-Control headers we added to the proxy.
      links.push(<link key={`link-${i}`} rel="stylesheet" href={href} />);
    } else if (rel === 'preconnect') {
      const crossOrigin = $(el).attr('crossorigin') as "anonymous" | "use-credentials" | "" | undefined;
      links.push(<link key={`link-${i}`} rel="preconnect" href={href} crossOrigin={crossOrigin} />);
    }
  });

  // Extract inline <style> blocks (e.g. MkDocs typography CSS variables)
  const styles: React.ReactNode[] = [];
  $('head style').each((i, el) => {
    styles.push(<style key={`style-${i}`} dangerouslySetInnerHTML={{ __html: $(el).html() || '' }} />);
  });

  // Extract scripts
  const scripts: React.ReactNode[] = [];
  $('script').each((i, el) => {
    const src = $(el).attr('src');
    const type = $(el).attr('type');
    const id = $(el).attr('id');
    const content = $(el).html();

    // Do not extract data islands like application/json. 
    // They are not executable scripts and must remain in the DOM structure for MkDocs JS to read them.
    if (type && type !== 'text/javascript' && type !== 'module') {
      return;
    }
    
    if (src) {
      scripts.push(<Script key={`script-${i}`} id={id || `mkdocs-ext-${i}`} src={src} strategy="afterInteractive" type={type} />);
    } else if (content) {
      scripts.push(
        <Script 
          key={`script-${i}`} 
          id={id || `mkdocs-inline-${i}`} 
          strategy="afterInteractive" 
          type={type}
          dangerouslySetInnerHTML={{ __html: content }} 
        />
      );
    }
    // Remove scripts from the DOM so they aren't injected via dangerouslySetInnerHTML
    $(el).remove();
  });

  // Hide MkDocs header and footer instead of removing them
  // The MkDocs JS bundle expects these elements to exist in the DOM and crashes if they are completely removed.
  $('header.md-header').empty().attr('style', 'display: none !important');
  $('footer.md-footer').empty().attr('style', 'display: none !important');

  // Extract remaining body content
  const bodyContent = $('body').html() || '';

  return (
    <>
      {links}
      {styles}
      <div 
        suppressHydrationWarning 
        className="mkdocs-wrapper flex-1"
        dangerouslySetInnerHTML={{ __html: bodyContent }} 
      />
      {scripts}
    </>
  );
}
