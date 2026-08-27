import Link from "next/link";

export default function NotFound() {
  return <main className="page container"><div className="auth panel"><p className="eyebrow">404</p><h1 style={{ fontSize: 48 }}>Esta página saiu para brincar.</h1><p className="lead">O endereço que você procurou não existe ou foi movido.</p><Link href="/" className="button">Voltar ao início</Link></div></main>;
}
