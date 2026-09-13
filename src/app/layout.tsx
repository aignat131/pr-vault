import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { RolesProvider } from "@/context/RolesContext";
import { ExercisesProvider } from "@/context/ExercisesContext";
import { ToastProvider } from "@/context/ToastContext";
import ToastContainer from "@/components/Toast";
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
  title: "PR Vault — Calisthenics Personal Records",
  description:
    "Track and share your calisthenics personal records. Pull-ups, muscle-ups, levers, and more.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PR Vault",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-dvh flex flex-col bg-[#09090b] text-white overflow-x-hidden">
        <AuthProvider>
          <RolesProvider>
            <ExercisesProvider>
              <ToastProvider>
                {children}
                <ToastContainer />
              </ToastProvider>
            </ExercisesProvider>
          </RolesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
