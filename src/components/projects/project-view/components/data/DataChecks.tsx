import { useState } from "react";
import { ChevronDown, ChevronRight, ArrowUpDown } from "lucide-react";
import type { DataChecksSummary } from "./types";

interface DataChecksProps {
	data: DataChecksSummary;
}

export function DataChecks({ data }: DataChecksProps) {
	const [expandedCheck, setExpandedCheck] = useState<string | null>(null);

	const toggleExpand = (checkId: string) => {
		setExpandedCheck(expandedCheck === checkId ? null : checkId);
	};

	return (
		<div className="space-y-4">
			{/* Header - Outside the card */}
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold text-gray-900">Data Checks</h3>
				<div className="flex items-center gap-3">
					<span className="text-sm text-gray-600">
						Total Respondents: {data.totalRespondents}
					</span>
					<span className="px-3 py-1 bg-green-50 text-green-700 rounded-md text-sm font-medium">
						Passed: {data.passed}
					</span>
					<span className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-md text-sm font-medium">
						Warning: {data.warning}
					</span>
					<span className="px-3 py-1 bg-red-50 text-red-700 rounded-md text-sm font-medium">
						Critical: {data.critical}
					</span>
				</div>
			</div>

			{/* Table Card */}
			<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
				<table className="w-full">
					<thead className="bg-gray-50 border-b border-gray-200">
						<tr>
							<th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
								<div className="flex items-center gap-2">
									Check
									<ArrowUpDown className="h-4 w-4 text-gray-400" />
								</div>
							</th>
							<th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
								Affected objects (respondents or responses)
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-200">
						{data.checks.map((check) => (
							<>
								<tr key={check.id} className="hover:bg-gray-50">
									<td className="px-6 py-4 text-sm text-gray-900">
										<div className="flex items-center gap-2">
											{check.details && (
												<button
													onClick={() => toggleExpand(check.id)}
													className="text-gray-400 hover:text-gray-600"
												>
													{expandedCheck === check.id ? (
														<ChevronDown className="h-4 w-4" />
													) : (
														<ChevronRight className="h-4 w-4" />
													)}
												</button>
											)}
											{!check.details && <div className="w-4" />}
											<span>{check.name}</span>
										</div>
									</td>
									<td className="px-6 py-4 text-sm text-gray-900">
										{check.affectedCount}
									</td>
								</tr>
								{/* Expanded Details */}
								{expandedCheck === check.id && check.details && (
									<tr>
										<td colSpan={2} className="px-6 py-0">
											<div className="bg-gray-50 px-12 py-4">
												<table className="w-full">
													<thead>
														<tr className="border-b border-gray-200">
															<th className="px-4 py-2 text-left text-xs font-medium text-gray-600">
																Question ID
															</th>
															<th className="px-4 py-2 text-left text-xs font-medium text-gray-600">
																Responses Coded
															</th>
														</tr>
													</thead>
													<tbody>
														{check.details.map((detail, idx) => (
															<tr key={idx} className="border-b border-gray-200 last:border-0">
																<td className="px-4 py-2 text-sm text-gray-900">
																	{detail.questionId}
																</td>
																<td className="px-4 py-2 text-sm text-gray-900">
																	{detail.responsesCoded}
																</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
										</td>
									</tr>
								)}
							</>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
