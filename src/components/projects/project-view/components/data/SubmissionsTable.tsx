import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Submission } from "./types";

interface SubmissionsTableProps {
	submissions: Submission[];
	pageSize?: number;
}

export function SubmissionsTable({
	submissions,
	pageSize = 10,
}: SubmissionsTableProps) {
	const [currentPage, setCurrentPage] = useState(1);
	const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

	const totalPages = Math.ceil(submissions.length / pageSize);
	const startIndex = (currentPage - 1) * pageSize;
	const endIndex = startIndex + pageSize;
	const currentSubmissions = submissions.slice(startIndex, endIndex);

	const handleExportData = () => {
		// Convert submissions to CSV
		const headers = ["ID", "Timestamp", "Status", "Age", "Gender", "Location"];
		const csvContent = [
			headers.join(","),
			...submissions.map((s) =>
				[s.id, s.timestamp, s.status, s.age, s.gender, s.location].join(",")
			),
		].join("\n");

		// Create and download file
		const blob = new Blob([csvContent], { type: "text/csv" });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `submissions-${new Date().toISOString().slice(0, 10)}.csv`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		window.URL.revokeObjectURL(url);
	};

	const toggleRowSelection = (id: string) => {
		const newSelection = new Set(selectedRows);
		if (newSelection.has(id)) {
			newSelection.delete(id);
		} else {
			newSelection.add(id);
		}
		setSelectedRows(newSelection);
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold text-gray-900">Submissions</h2>
				<Button
					variant="outline"
					size="sm"
					onClick={handleExportData}
					className="gap-2"
				>
					<Download className="h-4 w-4" />
					Export Data
				</Button>
			</div>

			<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-gray-50">
							<TableHead className="w-[100px] font-semibold text-gray-700">
								ID
							</TableHead>
							<TableHead className="font-semibold text-gray-700">
								Timestamp
							</TableHead>
							<TableHead className="font-semibold text-gray-700">
								Status
							</TableHead>
							<TableHead className="font-semibold text-gray-700">Age</TableHead>
							<TableHead className="font-semibold text-gray-700">
								Gender
							</TableHead>
							<TableHead className="font-semibold text-gray-700">
								Location
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{currentSubmissions.map((submission) => (
							<TableRow
								key={submission.id}
								className={cn(
									"cursor-pointer transition-colors",
									selectedRows.has(submission.id) && "bg-gray-50"
								)}
								onClick={() => toggleRowSelection(submission.id)}
							>
								<TableCell className="font-medium">{submission.id}</TableCell>
								<TableCell className="text-gray-600">
									{submission.timestamp}
								</TableCell>
								<TableCell>
									<span
										className={cn(
											"inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium",
											submission.status === "valid"
												? "bg-emerald-100 text-emerald-800"
												: "bg-red-100 text-red-800"
										)}
									>
										{submission.status === "valid" ? "Valid" : "Invalid"}
									</span>
								</TableCell>
								<TableCell className="text-gray-600">{submission.age}</TableCell>
								<TableCell className="text-gray-600">
									{submission.gender}
								</TableCell>
								<TableCell className="text-gray-600">
									{submission.location}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<div className="flex items-center justify-between">
				<div className="text-sm text-gray-500">
					{selectedRows.size} of {currentSubmissions.length} row(s) selected.
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
						disabled={currentPage === 1}
					>
						Previous
					</Button>
					<div className="text-sm text-gray-600">
						Page {currentPage} of {totalPages}
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
						disabled={currentPage === totalPages}
					>
						Next
					</Button>
				</div>
			</div>
		</div>
	);
}
