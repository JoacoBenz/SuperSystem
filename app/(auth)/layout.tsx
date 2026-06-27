export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      <aside
        className="auth-brand"
        style={{
          flex: '0 0 42%',
          background: '#16181d',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '40px 44px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            EP
          </div>
          <span className="brand-word" style={{ fontWeight: 600, fontSize: 17 }}>ERP Platform</span>
        </div>

        <div>
          <h1
            className="brand-word"
            style={{ fontSize: 34, lineHeight: 1.12, margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}
          >
            Run your whole business in one place.
          </h1>
          <p style={{ marginTop: 18, fontSize: 15, color: 'rgba(255,255,255,0.6)', maxWidth: 380, lineHeight: 1.65 }}>
            Procurement, inventory, sales, finance and more — unified, fast, and built for the way your team actually works.
          </p>
        </div>

        <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)' }}>© 2026 ERP Platform</div>
      </aside>

      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: '#ffffff',
        }}
      >
        <div style={{ width: '100%', maxWidth: 380 }}>{children}</div>
      </main>
    </div>
  );
}
