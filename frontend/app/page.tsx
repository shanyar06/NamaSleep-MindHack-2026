import Link from "next/link"

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-3xl text-center space-y-6">
        <h1 className="text-5xl font-bold">Sleep LLM</h1>
        <p className="text-slate-300 text-lg">
          Human-in-the-loop insomnia risk triage powered by wearable-informed sleep signals.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/patient"
            className="rounded-xl bg-white text-black px-6 py-3 font-semibold"
          >
            Continue as Patient
          </Link>
          <Link
            href="/doctor"
            className="rounded-xl border border-slate-700 px-6 py-3 font-semibold"
          >
            Continue as Doctor
          </Link>
        </div>
      </div>
    </main>
  )
}