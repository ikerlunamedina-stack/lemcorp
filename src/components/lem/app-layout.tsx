"use client";

// Legacy layout wrapper — kept for compatibility.
// The new app shell uses <Navbar /> + <SubHeader /> + <Footer /> directly in page.tsx.
export function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
