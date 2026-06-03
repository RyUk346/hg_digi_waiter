export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-bg px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-serif text-ink">HyperGlow</h1>
          <p className="text-sm text-muted mt-1">Admin portal · Tavola Soho</p>
        </div>
        {children}
      </div>
    </main>
  );
}
