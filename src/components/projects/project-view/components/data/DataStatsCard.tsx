import { cn } from "@/lib/utils";

interface DataStatsCardProps {
	title: string;
	value: number | string;
	showProgress?: boolean;
	progressPercentage?: number;
	subtitle?: string;
	className?: string;
}

export function DataStatsCard({
	title,
	value,
	showProgress = false,
	progressPercentage,
	subtitle,
	className,
}: DataStatsCardProps) {
	return (
		<div
			className={cn(
				"bg-white rounded-lg border border-gray-200 p-6",
				className
			)}
		>
			<div className="space-y-3">
				<div className="text-sm text-gray-500">{title}</div>
				<div className="flex items-baseline justify-between">
					<div className="text-4xl font-semibold text-gray-900">{value}</div>
					{showProgress && progressPercentage !== undefined && (
						<div className="text-sm font-medium text-gray-600">
							{progressPercentage}%
						</div>
					)}
				</div>
				{showProgress && progressPercentage !== undefined && (
					<div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
						<div
							className="absolute top-0 left-0 h-full bg-burgundy-500 transition-all duration-500 rounded-full"
							style={{ width: `${progressPercentage}%` }}
						/>
					</div>
				)}
				{subtitle && (
					<div className="text-sm text-gray-500 pt-1">{subtitle}</div>
				)}
			</div>
		</div>
	);
}
