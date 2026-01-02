"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export type SandboxStatus = "connecting" | "connected";

// Heartbeat interval: ping every 1 minute to keep sandbox awake
const HEARTBEAT_INTERVAL_MS = 1 * 60 * 1000;

interface UseSandboxConnectionResult {
	sandboxStatus: SandboxStatus;
	hasConnectedOnce: boolean;
	previewUrl: string | null;
	isLoadingPreview: boolean;
	startEnsureLoop: () => void;
}

export function useSandboxConnection(
	projectId: string
): UseSandboxConnectionResult {
	const [sandboxStatus, setSandboxStatus] =
		useState<SandboxStatus>("connecting");
	const [hasConnectedOnce, setHasConnectedOnce] = useState(false);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [isLoadingPreview, setIsLoadingPreview] = useState(true);

	const ensureTimeoutRef = useRef<number | null>(null);
	const ensureAbortRef = useRef<AbortController | null>(null);
	const ensureActiveRef = useRef(false);
	const ensureBackoffMsRef = useRef(500);
	const startedForProjectRef = useRef<string | null>(null);
	const heartbeatIntervalRef = useRef<number | null>(null);

	const startEnsureLoop = useCallback(() => {
		// Guard: don't start if already active for this project
		if (ensureActiveRef.current && startedForProjectRef.current === projectId) {
			return;
		}
		
		// If switching projects, reset state
		if (startedForProjectRef.current !== projectId) {
			ensureActiveRef.current = false;
			ensureBackoffMsRef.current = 500;
		}
		
		ensureActiveRef.current = true;
		startedForProjectRef.current = projectId;

		setSandboxStatus("connecting");

		if (ensureTimeoutRef.current) {
			window.clearTimeout(ensureTimeoutRef.current);
			ensureTimeoutRef.current = null;
		}

		ensureAbortRef.current?.abort();
		ensureAbortRef.current = new AbortController();

		const attemptEnsure = async () => {
			if (ensureAbortRef.current?.signal.aborted) return;

			try {
				const res = await fetch(`/api/projects/${projectId}/sandbox/ensure`, {
					method: "POST",
					signal: ensureAbortRef.current?.signal,
				});

				if (!res.ok) {
					throw new Error(`Ensure failed: ${res.status}`);
				}

				// Try to get preview URL from response
				try {
					const data = await res.json();
					if (data.previewUrl) {
						setPreviewUrl(data.previewUrl);
					}
				} catch {
					// Response may not be JSON, that's okay
				}

				ensureActiveRef.current = false;
				ensureBackoffMsRef.current = 500;
				setSandboxStatus("connected");
				setHasConnectedOnce(true);
				setIsLoadingPreview(false);
			} catch {
				if (ensureAbortRef.current?.signal.aborted) return;

				setSandboxStatus("connecting");
				const delay = ensureBackoffMsRef.current;
				ensureBackoffMsRef.current = Math.min(
					Math.round(ensureBackoffMsRef.current * 1.7),
					5000
				);

				ensureTimeoutRef.current = window.setTimeout(() => {
					void attemptEnsure();
				}, delay);
			}
		};

		void attemptEnsure();
	}, [projectId]);

	// Ensure sandbox is ready (and keep retrying until it is)
	useEffect(() => {
		// Only start if we haven't started for this project yet
		// This prevents duplicate calls in React StrictMode
		if (startedForProjectRef.current !== projectId) {
			startEnsureLoop();
		}

		return () => {
			if (ensureTimeoutRef.current) {
				window.clearTimeout(ensureTimeoutRef.current);
				ensureTimeoutRef.current = null;
			}
			ensureAbortRef.current?.abort();
			ensureAbortRef.current = null;
			// Don't reset ensureActiveRef here - let startEnsureLoop manage it
			// This prevents the StrictMode double-call issue
		};
	}, [projectId, startEnsureLoop]);

	// Heartbeat: ping the sandbox periodically while connected to prevent hibernation
	useEffect(() => {
		console.log(`[Heartbeat] Effect running, status: ${sandboxStatus}, projectId: ${projectId}`);
		
		// Only start heartbeat when connected
		if (sandboxStatus !== "connected") {
			// Clear any existing heartbeat if we're not connected
			if (heartbeatIntervalRef.current) {
				console.log("[Heartbeat] Clearing interval - not connected");
				window.clearInterval(heartbeatIntervalRef.current);
				heartbeatIntervalRef.current = null;
			}
			return;
		}

		// Don't start another interval if one exists
		if (heartbeatIntervalRef.current) {
			console.log("[Heartbeat] Interval already exists, skipping");
			return;
		}

		// Send heartbeat pings every 1 minute
		const sendPing = async () => {
			console.log(`[Heartbeat] Sending ping to ${projectId}...`);
			try {
				await fetch(`/api/projects/${projectId}/sandbox/ping`, {
					method: "POST",
				});
				console.log("[Heartbeat] Ping sent successfully");
			} catch (e) {
				// Ping failures are non-critical, just log
				console.warn("[Heartbeat] Ping failed:", e);
			}
		};

		// Send first ping immediately, then at interval
		console.log(`[Heartbeat] Starting heartbeat, interval: ${HEARTBEAT_INTERVAL_MS}ms`);
		sendPing();
		heartbeatIntervalRef.current = window.setInterval(sendPing, HEARTBEAT_INTERVAL_MS);

		// Cleanup on unmount or when status changes
		return () => {
			console.log("[Heartbeat] Cleanup - clearing interval");
			if (heartbeatIntervalRef.current) {
				window.clearInterval(heartbeatIntervalRef.current);
				heartbeatIntervalRef.current = null;
			}
		};
	}, [projectId, sandboxStatus]);

	return {
		sandboxStatus,
		hasConnectedOnce,
		previewUrl,
		isLoadingPreview,
		startEnsureLoop,
	};
}
