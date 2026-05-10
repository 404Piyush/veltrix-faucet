import "./globals.css";

export const metadata = {
  title: "Veltrix Faucet",
  description: "Green terminal faucet for Veltrix L2",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
