import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DataStatsCard } from "./DataStatsCard";
import { SubmissionsTable } from "./SubmissionsTable";
import { dummySubmissions, dummyStats } from "./dummyData";

export function DataView() {
	const [showDetails, setShowDetails] = useState(false);
	const stats = dummyStats;
	const submissions = dummySubmissions;

	const progressPercentage = Math.round(
		(stats.totalRespondents / stats.sampleGoal) * 100
	);
	const remainingToGoal = stats.sampleGoal - stats.totalRespondents;

	return (
		<ScrollArea className="flex-1 bg-gray-50">
			<div className="p-6 space-y-6 max-w-7xl mx-auto">
				{/* Stats Cards */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<DataStatsCard
						title="Total Respondents"
						value={stats.totalRespondents}
						showProgress={true}
						progressPercentage={progressPercentage}
						subtitle={`${remainingToGoal} more required to reach sample goal`}
					/>
					<DataStatsCard
						title="Valid Respondents"
						value={`${stats.validPercentage}%`}
						subtitle={`${stats.invalidCount} responses flagged as invalid`}
					/>
				</div>

				{/* View Details Toggle */}
				<div className="flex justify-center">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setShowDetails(!showDetails)}
						className="gap-2 text-gray-600 hover:text-gray-900"
					>
						View Details
						{showDetails ? (
							<ChevronUp className="h-4 w-4" />
						) : (
							<ChevronDown className="h-4 w-4" />
						)}
					</Button>
				</div>

				{/* Details Section */}
				{showDetails && (
					<div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<div className="bg-white rounded-lg border border-gray-200 p-4">
								<div className="text-xs text-gray-500 mb-1">Sample Goal</div>
								<div className="text-2xl font-semibold text-gray-900">
									{stats.sampleGoal}
								</div>
							</div>
							<div className="bg-white rounded-lg border border-gray-200 p-4">
								<div className="text-xs text-gray-500 mb-1">Valid Responses</div>
								<div className="text-2xl font-semibold text-emerald-600">
									{submissions.filter((s) => s.status === "valid").length}
								</div>
							</div>
							<div className="bg-white rounded-lg border border-gray-200 p-4">
								<div className="text-xs text-gray-500 mb-1">
									Invalid Responses
								</div>
								<div className="text-2xl font-semibold text-red-600">
									{stats.invalidCount}
								</div>
							</div>
							<div className="bg-white rounded-lg border border-gray-200 p-4">
								<div className="text-xs text-gray-500 mb-1">Completion Rate</div>
								<div className="text-2xl font-semibold text-gray-900">
									{progressPercentage}%
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Submissions Table */}
				<SubmissionsTable submissions={submissions} pageSize={10} />
			</div>
		</ScrollArea>
	);
}
