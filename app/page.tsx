export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 text-center">
      <div className="max-w-lg space-y-6">
        <div className="text-5xl">🌱</div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Garden now lives <a href="https://main.d2kd6y798g93tr.amplifyapp.com/" className="text-blue-500 underline">here</a>
        </h1>
        <div className="space-y-4 text-left text-base leading-relaxed text-zinc-600">
          <p>
            per IT's request, I had to move Garden to a different hosting provider, so the old URL is no longer working. If you were using the old URL, please update your bookmarks to the new one. Sorry for the inconvenience!
          </p>
          <p className="text-zinc-900 font-medium">-Donovan</p>
        </div>
      </div>
    </div>
  );
}
