import type { Submission, DataStats } from "./types";

const ageGroups = ["18-24", "25-34", "35-44", "45-54", "55+"];
const genders = ["Male", "Female", "Non-binary", "Prefer not to say"];
const locations = [
	"New York",
	"Los Angeles",
	"Chicago",
	"Houston",
	"Phoenix",
	"Philadelphia",
	"San Antonio",
	"San Diego",
	"Dallas",
	"San Jose",
	"Austin",
	"Jacksonville",
	"Fort Worth",
	"Columbus",
	"Indianapolis",
	"Charlotte",
	"San Francisco",
	"Seattle",
	"Denver",
	"Washington",
	"Boston",
	"Nashville",
	"Detroit",
	"Portland",
	"Las Vegas",
	"Memphis",
	"Louisville",
	"Baltimore",
	"Milwaukee",
	"Albuquerque",
];

// Generate a timestamp for the past 7 days
const generateTimestamp = (index: number): string => {
	const now = new Date();
	const daysAgo = Math.floor(index / 100); // Spread submissions over 7 days
	const hoursAgo = Math.floor(Math.random() * 24);
	const minutesAgo = Math.floor(Math.random() * 60);

	const date = new Date(now);
	date.setDate(date.getDate() - daysAgo);
	date.setHours(date.getHours() - hoursAgo);
	date.setMinutes(date.getMinutes() - minutesAgo);

	return date.toISOString().slice(0, 16).replace("T", " ");
};

// Generate submissions with 80% valid rate
export const generateSubmissions = (count: number): Submission[] => {
	const submissions: Submission[] = [];

	for (let i = 0; i < count; i++) {
		const isValid = Math.random() > 0.2; // 80% valid rate

		submissions.push({
			id: `R${String(i + 1).padStart(3, "0")}`,
			timestamp: generateTimestamp(i),
			status: isValid ? "valid" : "invalid",
			age: ageGroups[Math.floor(Math.random() * ageGroups.length)],
			gender: genders[Math.floor(Math.random() * genders.length)],
			location: locations[Math.floor(Math.random() * locations.length)],
		});
	}

	// Sort by timestamp descending (most recent first)
	return submissions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
};

// Calculate stats from submissions
export const calculateStats = (submissions: Submission[]): DataStats => {
	const totalRespondents = submissions.length;
	const validCount = submissions.filter(s => s.status === "valid").length;
	const invalidCount = submissions.filter(s => s.status === "invalid").length;
	const validPercentage = Math.round((validCount / totalRespondents) * 100);
	const sampleGoal = 800; // Fixed sample goal

	return {
		totalRespondents,
		sampleGoal,
		validPercentage,
		invalidCount,
	};
};

// Generate initial dummy data (700 submissions)
export const dummySubmissions = generateSubmissions(700);
export const dummyStats = calculateStats(dummySubmissions);
