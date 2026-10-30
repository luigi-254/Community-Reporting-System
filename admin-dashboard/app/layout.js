import "./globals.css";
import { AuthProvider } from "../lib/auth-context";
import AdminAuthNav from "./components/AdminAuthNav";

export const metadata = {
  title: "Community Reporting System | Admin",
  description: "Administrator dashboard for community reports and officer accounts.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#f7f7f2] text-[#243329]">
        <AuthProvider>
          <AdminAuthNav />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
