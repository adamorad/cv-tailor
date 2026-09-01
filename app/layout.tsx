import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CV Tailor",
  description: "Tailor your CV to a job description, locally.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
