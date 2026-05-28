import type { Metadata } from "next";
import { ToastViewport } from "@/components/feedback/toast-viewport";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Technical Interviewer Voice System",
  description: "Voice-based AI platform for technical interviews.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body>
        {children}
        <ToastViewport />
      </body>
    </html>
  );
}
