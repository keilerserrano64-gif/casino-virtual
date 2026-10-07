// Cabecera y menú en UN solo componente (en el sitio actual se repiten en 33 HTML).
const ENLACES = [['Juegos', '/juegos'], ['Torneos', '/torneos'], ['Ranking', '/ranking'], ['Noticias', '/noticias'], ['Ayuda', '/ayuda']] as const;

export default function Header() {
  return (
    <header style={{ display: 'flex', gap: 24, padding: '16px 24px', background: '#0b0618', color: '#ffcc33' }}>
      <strong>ROYAL CASINO</strong>
      <nav style={{ display: 'flex', gap: 16 }}>
        {ENLACES.map(([texto, href]) => <a key={href} href={href} style={{ color: 'inherit' }}>{texto}</a>)}
      </nav>
    </header>
  );
}
