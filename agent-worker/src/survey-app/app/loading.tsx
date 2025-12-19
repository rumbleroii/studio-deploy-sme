export default function Loading() {
  return (
    <div className="page-container animate-pulse">
      {/* Page Title Skeleton */}
      <div className="h-10 bg-gray-200 rounded w-2/3 mb-8"></div>

      {/* Objectives Section Skeleton */}
      <div className="mb-8">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      </div>

      {/* Audience Section Skeleton */}
      <div className="mb-8">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>

      {/* Questionnaire Label Skeleton */}
      <div className="h-6 bg-gray-200 rounded w-40 mb-6"></div>

      {/* Survey Sections Skeleton */}
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
