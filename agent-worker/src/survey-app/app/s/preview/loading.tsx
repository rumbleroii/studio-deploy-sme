export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-2xl w-full mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-12 text-center animate-pulse">
          {/* Title Skeleton */}
          <div className="h-10 bg-gray-200 rounded w-3/4 mx-auto mb-6"></div>

          {/* Content Skeleton */}
          <div className="space-y-4 mb-8 text-left">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>

            {/* Info Box Skeleton */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
              <div className="h-3 bg-blue-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-blue-200 rounded w-3/4"></div>
            </div>
          </div>

          {/* Button Skeleton */}
          <div className="h-12 bg-gray-200 rounded w-48 mx-auto"></div>

          {/* Footer Skeleton */}
          <div className="mt-8">
            <div className="h-3 bg-gray-200 rounded w-32 mx-auto"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
