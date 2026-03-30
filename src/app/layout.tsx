import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RecaptchaProvider from "@/components/RecaptchaProvider";
import SiteNoticeModal from "@/components/SiteNoticeModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "BKFC | Broadalbin-Kennyetto Fire Company",
    template: "%s | BKFC",
  },
  description:
    "Broadalbin-Kennyetto Fire Company — proudly serving the communities of Broadalbin and Mayfield in Fulton County, New York.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-gray-900">
        <RecaptchaProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <SiteNoticeModal />
        </RecaptchaProvider>
      </body>
    </html>
  );
}
