export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative w-16 h-16">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="absolute top-2 left-2 w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin-slow"></div>
      </div>
      <div className="mt-6 space-y-2 text-center">
        <p className="text-lg font-semibold text-gray-200 animate-pulse">
          Analyzing Repository...
        </p>
        <p className="text-sm text-gray-400">
          This may take a few moments
        </p>
      </div>
    </div>
  );
}

// Made with Bob
