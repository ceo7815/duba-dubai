export function WorkLoading() {
  return (
    <main className="app-main min-h-dvh bg-paper" aria-busy="true" aria-label="טוען">
      <header className="app-header sticky top-0 z-20 grid h-[4.75rem] grid-cols-[1fr_auto_1fr] items-center bg-[#111111] px-4 text-white">
        <span />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/duba-logo.png" alt="duba" className="h-12 w-auto" />
        <span />
      </header>
      <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 py-4">
        <div className="skeleton h-8 w-32 rounded-xl" />
        <div className="skeleton h-28 rounded-3xl" />
        <div className="skeleton h-16 rounded-2xl" />
        <div className="skeleton h-16 rounded-2xl" />
        <div className="skeleton h-16 rounded-2xl" />
      </div>
      <nav className="app-nav no-print">
        <div className="h-[4.75rem]" />
      </nav>
    </main>
  );
}
