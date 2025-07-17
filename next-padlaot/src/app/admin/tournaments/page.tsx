import Link from 'next/link';

export default function AdminTournamentsPage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 24 }}>ניהול טורנירים</h1>
      <Link href="/admin/tournaments/create">
        <button style={{ padding: '12px 24px', fontSize: 18, fontWeight: 700, background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, marginBottom: 32 }}>
          צור טורניר חדש
        </button>
      </Link>
      <div style={{ marginTop: 32 }}>
        {/* TODO: Tournament list table/grid will go here */}
        <p>כאן תוצג רשימת הטורנירים.</p>
      </div>
    </div>
  );
} 