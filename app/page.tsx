export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 text-center">
      <div className="max-w-lg space-y-6">
        <div className="text-5xl">🌱</div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Garden is temporarily offline
        </h1>
        <div className="space-y-4 text-left text-base leading-relaxed text-zinc-600">
          <p>Hey everyone,</p>
          <p>
            Garden is temporarily offline, I&apos;ve been receiving some
            pressure from cybersecurity to bring the frontend within our network
            and host it on Honda infrastructure, and to update the login system
            to use Honda&apos;s approved provider.
          </p>
          <p>
            I&apos;m working on getting this done as fast as I can. Appreciate
            your patience! When this is all over, the app will look the same,
            just with a different, less memorable url (bookmark would be handy).
          </p>
          <p className="text-zinc-900 font-medium">-Donovan</p>
        </div>
        <div className="pt-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-sm text-zinc-600">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </span>
            Migration in progress
          </div>
        </div>
      </div>
    </div>
  );
}
