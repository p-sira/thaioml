import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkThemeProvider } from "@/components/ClerkThemeProvider";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/ThemeProvider";
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
  title: "ThaiOML - Open Medical Library",
  description: "AI Search and Portal for ThaiOML",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("thaioml-theme")?.value || "leuko";

  return (
    <ClerkThemeProvider initialTheme={theme}>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col" data-md-color-scheme={theme}>
          <ThemeProvider>{children}</ThemeProvider>
        </body>
      </html>
    </ClerkThemeProvider>
  );
}
