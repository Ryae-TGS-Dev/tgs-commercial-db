import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Leaf } from "lucide-react";
import { SidebarNav } from "@/components/SidebarNav";
import { TopBar } from "@/components/TopBar";
import { DataProvider } from "@/context/DataContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "TGS Commercial | Community Intelligence",
  description: "Advanced community management and profitability tracking for TGS.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased" style={{ background: "var(--bg)", color: "var(--text)" }}>
        <DataProvider>
          <div style={{ display: "flex", minHeight: "100vh" }}>
            {/* Sidebar */}
            <aside
              style={{
                width: 220,
                flexShrink: 0,
                position: "fixed",
                top: 0,
                left: 0,
                bottom: 0,
                background: "var(--surface)",
                borderRight: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                zIndex: 50,
              }}
            >
              {/* Logo */}
              <div style={{ padding: "24px 20px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      background: "var(--accent)",
                      borderRadius: 9,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Leaf size={16} color="#ffffff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>TGS Commercial</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-subtle)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      Community Intel
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: "var(--border)", margin: "0 20px 16px" }} />

              {/* Nav */}
              <SidebarNav />

            </aside>

            {/* Main */}
            <main style={{ flex: 1, marginLeft: 220, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              <TopBar />
              <div style={{ flex: 1 }}>{children}</div>
            </main>
          </div>
        </DataProvider>
      </body>
    </html>
  );
}
