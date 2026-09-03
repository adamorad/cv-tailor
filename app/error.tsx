"use client";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-[28px] font-semibold tracking-tight">
          Something went sideways.
        </h1>
        <p className="mt-3 text-[15px] text-text-secondary">
          The app hit an error while rendering. It is local-only, so nothing was
          sent anywhere — try again, or reload the page if it keeps happening.
        </p>
        {error.digest && (
          <p className="mt-3 text-[12px] text-text-secondary">
            Error ID: {error.digest}
          </p>
        )}
        <button
          type="button"
          onClick={() => retry()}
          className="mt-6 rounded-full bg-accent hover:bg-accent-hover active:bg-accent-active active:scale-[0.97] text-white px-6 py-3 text-[15px] font-medium transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
