export const metadata = {
  title: "Hotel Reservas",
  description: "Sistema de gestión de reservas",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
