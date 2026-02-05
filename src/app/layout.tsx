import type { Metadata } from "next";
import { Lato } from 'next/font/google';
// import localFont from 'next/font/local';
import "./globals.css";
import { MainNav } from "../components/MainNav";
import { Toaster } from 'sonner';
import DynamicTitle from "@/components/DynamicTitle";
import GlobalSync from "@/components/GlobalSync";

const lato = Lato({
  subsets: ['latin'],
  weight: ['100', '300', '400', '700', '900'],
  variable: '--font-lato',
});

// const cascadiaCode = localFont({
//   src: '../public/fonts/CascadiaCode/CascadiaCode-VariableFont_wght.ttf',
//   variable: '--font-cascadia',
// });

export async function generateMetadata(): Promise<Metadata> {
  let storeName = "Garayi";

  try {
    // For server-side metadata generation, we need a full URL
    // Use NEXT_PUBLIC_API_URL if available, otherwise skip fetching
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    if (API_URL && API_URL.startsWith('http')) {
      // Fetch settings with a short revalidation time so updates appear reasonably quickly
      const res = await fetch(`${API_URL}/settings`, { next: { revalidate: 60 } });
      if (res.ok) {
        const data = await res.json() as { name?: string };
        if (data.name) {
          storeName = data.name;
        }
      }
    }
    // Note: If API_URL is not set, we simply use the default "Garayi" store name
  } catch (error) {
    console.error("Failed to fetch store settings for metadata:", error);
  }

  return {
    title: storeName,
    description: "Point of Sale System",
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: storeName,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased ${lato.variable} flex flex-col h-screen overflow-hidden`}>
        <DynamicTitle />
        <MainNav />
        {/* This is where the AdminLayout component is rendered when navigating to /admin
          - The MainNav is ABOVE all children, including the AdminLayout.
          - Ensure MainNav is styled as a BAR, not a full background.
        */}
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
