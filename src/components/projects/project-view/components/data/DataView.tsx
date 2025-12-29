import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DataStatsCard } from "./DataStatsCard";
import { SubmissionsTable } from "./SubmissionsTable";
import { DataChecks } from "./DataChecks";
import { dummySubmissions, dummyStats, dummyQuotaProgress, dummyDataChecks } from "./dummyData";

export function DataView() {
	const [showDetails, setShowDetails] = useState(false);
	const stats = dummyStats;
	const submissions = dummySubmissions;
	const quotaProgress = dummyQuotaProgress;
	const dataChecks = dummyDataChecks;

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

				{/* Details Section - Quota Progress */}
				{showDetails && (
					<div className="rounded-lg border border-gray-200 p-6 animate-in fade-in slide-in-from-top-2 duration-300">
						<h3 className="text-xl font-semibold text-gray-900 mb-6">
							Quota Progress
						</h3>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
							{quotaProgress.sections.map((section, idx) => (
								<div key={idx}>
									<h4 className="text-base font-medium text-gray-900 mb-4">
										{section.title}
									</h4>
									<div className="space-y-4">
										{section.items.map((item, itemIdx) => (
											<div key={itemIdx}>
												<div className="flex justify-between items-center mb-2">
													<span className="text-sm text-gray-600">
														{item.label}
													</span>
													<span className="text-sm font-semibold text-gray-900">
														{item.progress}%
													</span>
												</div>
												<div className="h-2 bg-gray-200 rounded-full overflow-hidden">
													<div
														className="h-full bg-burgundy-500 rounded-full transition-all duration-300"
														style={{ width: `${item.progress}%` }}
													/>
												</div>
											</div>
										))}
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Data Checks */}
				<DataChecks data={dataChecks} />

				{/* Submissions Table */}
				<SubmissionsTable submissions={submissions} pageSize={10} />
			</div>
		</ScrollArea>
	);
}
