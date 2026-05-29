import type { Metadata } from "next";
import { ToastViewport } from "@/components/feedback/toast-viewport";
import "./globals.css";

export const metadata: Metadata = {
  title: "Entrevistador Técnico IA",
  description: "Plataforma de entrevistas técnicas por voz con IA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        {children}
        <ToastViewport />
      </body>
    </html>
  );
}
