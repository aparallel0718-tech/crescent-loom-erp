import './globals.css';
import Providers from '../components/Providers';

export const metadata = {
  title: 'Crescent Loom — Business OS',
  description: 'Internal business management dashboard for Crescent Loom',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-chalk text-midnight">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
