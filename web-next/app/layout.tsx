import type { Metadata } from 'next';
import Header from '../components/Header';

export const metadata: Metadata = {
  title: 'Royal Casino — casino virtual con monedas ficticias',
  description: 'Tragamonedas, ruleta, Blackjack, poker, dados, bingo y carreras con monedas 100% ficticias.',
  openGraph: { title: 'Royal Casino', description: 'Casino virtual sin dinero real', type: 'website' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="es"><body style={{ margin: 0, background: '#0b0618', color: '#fff' }}><Header />{children}</body></html>);
}
