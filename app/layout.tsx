import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { AppSessionProvider } from "@/components/providers/app-session-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Agri System",
  description: "農場の記録・分析・管理を一元化する農業運用サービス",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <AuthProvider>
            <AppSessionProvider>
              {children}
              <Toaster richColors position="top-right" />
            </AppSessionProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
