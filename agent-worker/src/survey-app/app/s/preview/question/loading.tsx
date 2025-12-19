export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 animate-pulse">
        {/* Progress Bar Skeleton */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-gray-300 h-2 rounded-full w-1/3"></div>
          </div>
        </div>

        {/* Question Card Skeleton */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="space-y-4">
            {/* Question Text Skeleton */}
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-6"></div>

            {/* Options Skeleton */}
            <div className="space-y-3">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>

        {/* Navigation Buttons Skeleton */}
        <div className="flex justify-between items-center">
          <div className="h-10 bg-gray-200 rounded w-32"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>

        {/* Question Counter Skeleton */}
        <div className="text-center mt-6">
          <div className="h-4 bg-gray-200 rounded w-40 mx-auto"></div>
        </div>
      </div>
    </div>
  );
}
