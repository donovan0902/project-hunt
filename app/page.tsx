export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 text-center">
      <div className="max-w-md space-y-6">
        <div className="text-5xl">🌱</div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          We&apos;ll be right back
        </h1>
        <p className="text-base leading-relaxed text-zinc-500">
          Garden is currently undergoing scheduled maintenance. We&apos;re
          working on improvements and expect to be back shortly.
        </p>
        <div className="pt-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-sm text-zinc-600">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </span>
            Maintenance in progress
          </div>
        </div>
      </div>
    </div>
  );
}
