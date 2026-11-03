import "./globals.css";
import { AuthProvider } from "../lib/auth-context";

export const metadata = {
  title: "Mtaa Fix | Admin",
  description: "Administrator dashboard for community reports and officer accounts.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#f7f7f2] text-[#243329]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
