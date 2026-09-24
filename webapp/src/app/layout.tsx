import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkThemeProvider } from "@/components/ClerkThemeProvider";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PostHogProvider } from "@/components/PostHogProvider";
import { CookieBanner } from "@/components/CookieBanner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Script from "next/script";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ThaiOML - Open Medical Library of Thailand",
  description: "AI Search and Portal for ThaiOML",
  icons: {
    icon: "/favicon.svg",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("thaioml-theme")?.value || "leuko";

  return (
    <ClerkThemeProvider initialTheme={theme}>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <head>
          <meta name="view-transition" content="same-origin" />
          <Script
            id="speculation-rules"
            type="speculationrules"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                prerender: [
                  {
                    urls: ["/contribute/", "/about/"],
                    eagerness: "moderate",
                  },
                ],
              }),
            }}
          />
        </head>
        <body className="min-h-full flex flex-col font-sans bg-background text-foreground" data-md-color-scheme={theme} suppressHydrationWarning>
          <Script
            id="theme-script"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  try {
                    var match = document.cookie.match('(^|;) ?thaioml-theme=([^;]*)(;|$)');
                    var theme = match ? match[2] : null;
                    if (!theme) {
                      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'darkroom' : 'leuko';
                    }
                    document.body.setAttribute('data-md-color-scheme', theme);
                  } catch (e) {}
                })();
              `,
            }}
          />
          <ThemeProvider>
            <PostHogProvider>
              <Navbar />
              <main className="flex-1 flex flex-col">
                {children}
              </main>
              <Footer />
              <CookieBanner />
            </PostHogProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkThemeProvider>
  );
}
