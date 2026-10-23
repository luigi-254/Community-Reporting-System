import "./globals.css";
import { AuthProvider } from "../lib/auth-context";

export const metadata = {
  title: "Community Reporting Admin Dashboard",
  description: "Admin dashboard for managing community reports and users",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-gray-100 text-gray-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
