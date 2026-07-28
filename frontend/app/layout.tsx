import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DriftLens · Medical device evidence review",
  description:
    "Trace where a medical device implementation has drifted from reviewed design and inspect the evidence behind every change.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "DriftLens",
    description: "Trace every change to its evidence.",
    images: [{ url: "/og.png", width: 1680, height: 945, alt: "DriftLens evidence review" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DriftLens",
    description: "Trace every change to its evidence.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
