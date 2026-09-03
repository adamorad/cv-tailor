import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-[28px] font-semibold tracking-tight">
          Page not found.
        </h1>
        <p className="mt-3 text-[15px] text-text-secondary">
          There is nothing here. CV Tailor only has the one page.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-accent hover:bg-accent-hover active:bg-accent-active active:scale-[0.97] text-white px-6 py-3 text-[15px] font-medium transition"
        >
          Back to CV Tailor
        </Link>
      </div>
    </div>
  );
}
