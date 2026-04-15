import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata = {
  title: "Cape PM",
  description: "Property Management Operating System",
  appleWebApp: {
    title: "Cape PM",
    capable: true,
    statusBarStyle: "default" as const,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      localization={{
        signIn: {
          start: { title: "Continue to Cape PM Services", subtitle: "" },
        },
        signUp: {
          start: { title: "Continue to Cape PM Services", subtitle: "" },
        },
      }}
    >
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap"
            rel="stylesheet"
          />
        </head>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}