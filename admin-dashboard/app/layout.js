import "./globals.css";
import AdminAuthNav from "./components/AdminAuthNav";

export const metadata = {
  title: "Community Reporting System | Admin",
  description: "Administrator dashboard for community reports and officer accounts.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AdminAuthNav />
        {children}
      </body>
    </html>
  );
}