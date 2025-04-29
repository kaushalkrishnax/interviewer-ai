import "./globals.css";

export const metadata = {
  title: "Interviewer AI",
  description: "AI-powered interview simulator",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400..700;1,400..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased dark:bg-black dark:text-white">
        {children}
      </body>
    </html>
  );
}
