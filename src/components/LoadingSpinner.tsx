"use client";

export default function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
      <div className="text-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-blue-400 border-t-transparent" />
        {message && (
          <p className="mt-3 text-white text-sm">{message}</p>
        )}
      </div>
    </div>
  );
}
