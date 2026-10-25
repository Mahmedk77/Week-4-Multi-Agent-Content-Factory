import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Newsreader } from "next/font/google";
import { Nav } from "@/components/Nav";
import { RunProvider } from "@/components/run/RunProvider";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const newsreader = Newsreader({ variable: "--font-newsreader", subsets: ["latin"], style: ["normal", "italic"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

// Absolute base for link-preview URLs. On Vercel, VERCEL_PROJECT_PRODUCTION_URL is set automatically;
// NEXT_PUBLIC_SITE_URL can override it (e.g. a custom domain).
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

const TITLE = "Draftloom";
const DESCRIPTION =
  "A multi-agent content factory: AI agents research, write and fact-check a blog post, then the run pauses for your review. Nothing is published until you approve it.";

// Icons (favicon.ico, icon.svg, apple-icon.png), the preview image (opengraph-image.png) and the
// manifest (manifest.ts) are file conventions in src/app, so Next adds their tags automatically.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s · Draftloom" },
  description: DESCRIPTION,
  applicationName: "Draftloom",
  // The site is private (passcode), so keep it out of search engines.
  robots: { index: false, follow: false },
  openGraph: { type: "website", siteName: "Draftloom", title: TITLE, description: DESCRIPTION, url: "/" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  appleWebApp: { capable: true, title: "Draftloom", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

// viewportFit "cover" makes env(safe-area-inset-bottom) work, so the tab bar clears the iPhone home indicator.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F3EE" },
    { media: "(prefers-color-scheme: dark)", color: "#141412" },
  ],
};

// Runs before the page paints, so a saved dark theme never flashes light first. Default is light.
const THEME_SCRIPT = `try{document.documentElement.dataset.theme=localStorage.getItem("theme")==="dark"?"dark":"light"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the theme script may change data-theme before React hydrates.
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${inter.variable} ${newsreader.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {/* RunProvider keeps the current run (and its live stream) alive while you switch tabs. */}
        <RunProvider>
          <Nav />
          <div className="flex-1 min-h-0 m-tabbar-space">{children}</div>
        </RunProvider>
      </body>
    </html>
  );
}
