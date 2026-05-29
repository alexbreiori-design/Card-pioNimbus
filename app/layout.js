import './globals.css';

export const metadata = {
  title: 'Cardápio Digital',
  description: 'Cardápio digital para restaurantes',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
