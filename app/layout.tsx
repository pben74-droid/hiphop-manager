export const metadata = {
  title: "Hip Hop Manager",
  description: "Gestionale Hip Hop Family Academy",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body style={{ margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
