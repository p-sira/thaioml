import Link from 'next/link'
import { goToRandomArticle } from './actions/randomArticle'
import { Search, Sparkles } from 'lucide-react'

export const dynamic = 'force-static';
export const revalidate = 86400;

export default async function Home() {
  return (
    <div className="flex-1 flex flex-col items-center bg-background min-h-screen">
      {/* Main Hero / Search Area */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl px-6 py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight mb-2">
          Open Medical Library of Thailand
        </h1>
        <p className="text-lg text-foreground/70 mb-10">
          The largest open-source medical knowledge base for healthcare professionals.
        </p>

        {/* Search Box */}
        <form action="/search/" method="GET" className="w-full max-w-2xl relative shadow-sm hover:shadow-md transition-shadow duration-200 rounded-full border border-foreground/20 bg-background focus-within:ring-2 focus-within:ring-foreground/20 focus-within:border-foreground/40">
          <div className="flex items-center px-6 py-4">
            <Search className="w-5 h-5 text-foreground/50 mr-3" />
            <input
              type="text"
              name="q"
              placeholder="Search guidelines, clinical trials, or articles..."
              className="flex-1 bg-transparent outline-none text-foreground placeholder:text-foreground/50"
            />
          </div>
        </form>

        {/* Trending Searches & Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground/50">Trending:</span>
            <div className="flex gap-2">
              <Link href="/search/?q=hypertension" className="px-3 py-1 rounded-full bg-foreground/5 text-foreground/70 text-sm hover:bg-foreground/10 transition">
                Hypertension
              </Link>
              <Link href="/search/?q=diabetes" className="px-3 py-1 rounded-full bg-foreground/5 text-foreground/70 text-sm hover:bg-foreground/10 transition">
                Diabetes
              </Link>
            </div>
          </div>
          
          <div className="hidden sm:block text-foreground/20">•</div>

          <form action={goToRandomArticle}>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-foreground/5 text-foreground hover:bg-foreground/10 transition text-sm font-medium"
            >
              <Sparkles className="w-4 h-4 text-blue-500" />
              I'm feeling lucky
            </button>
          </form>
        </div>
      </main>

      {/* Contributors and Sponsors */}
      <section className="w-full py-16 border-t border-foreground/10 bg-foreground/5">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h3 className="text-lg font-semibold text-foreground/80 mb-6">Supported by Contributors & Sponsors</h3>
          <div className="flex flex-wrap justify-center items-center gap-8 mb-8 opacity-60 grayscale">
            {/* Placeholder for organization logos */}
            <div className="h-8 w-32 bg-foreground/20 rounded-md"></div>
            <div className="h-8 w-24 bg-foreground/20 rounded-md"></div>
            <div className="h-8 w-40 bg-foreground/20 rounded-md"></div>
            <div className="h-8 w-28 bg-foreground/20 rounded-md"></div>
          </div>
          <p className="text-sm text-foreground/60">
            Contact us for an opportunity to collaborate.
          </p>
        </div>
      </section>

    </div>
  )
}
