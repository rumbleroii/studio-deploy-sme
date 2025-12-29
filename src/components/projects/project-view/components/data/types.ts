export type SubmissionStatus = "valid" | "invalid";

export interface Submission {
	id: string;
	timestamp: string;
	status: SubmissionStatus;
	age: string;
	gender: string;
	location: string;
}

export interface DataStats {
	totalRespondents: number;
	sampleGoal: number;
	validPercentage: number;
	invalidCount: number;
}

export interface QuotaItem {
	label: string;
	progress: number;
	current: number;
	target: number;
}

export interface QuotaSection {
	title: string;
	items: QuotaItem[];
}

export interface QuotaProgress {
	sections: QuotaSection[];
}

export interface DataCheckDetail {
	questionId: string;
	responsesCoded: number;
}

export interface DataCheck {
	id: string;
	name: string;
	affectedCount: number;
	status: "passed" | "warning" | "critical";
	details?: DataCheckDetail[];
}

export interface DataChecksSummary {
	totalRespondents: number;
	passed: number;
	warning: number;
	critical: number;
	checks: DataCheck[];
}
