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
