"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export type SandboxStatus = "connecting" | "connected";

const HEARTBEAT_INTERVAL_MS = 60000; // 1 minute
const MAX_RETRIES = 20;

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
	const [sandboxStatus, setSandboxStatus] = useState<SandboxStatus>("connecting");
	const [hasConnectedOnce, setHasConnectedOnce] = useState(false);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [isLoadingPreview, setIsLoadingPreview] = useState(true);

	const retryTimeoutRef = useRef<number | null>(null);
	const abortControllerRef = useRef<AbortController | null>(null);
	const retryCountRef = useRef(0);
	const isConnectingRef = useRef(false);
	const heartbeatIntervalRef = useRef<number | null>(null);
	const previousProjectIdRef = useRef<string | null>(null);

	const connectToSandbox = useCallback(async () => {
		// Skip if already connecting
		if (isConnectingRef.current) return;

		isConnectingRef.current = true;
		setSandboxStatus("connecting");

		// Clear any pending retries
		if (retryTimeoutRef.current) {
			clearTimeout(retryTimeoutRef.current);
			retryTimeoutRef.current = null;
		}

		// Cancel previous request
		abortControllerRef.current?.abort();
		abortControllerRef.current = new AbortController();

		try {
			console.log(`[Sandbox] Connecting attempt ${retryCountRef.current + 1}/${MAX_RETRIES}`);

			const res = await fetch(`/api/projects/${projectId}/sandbox/ensure`, {
				method: "POST",
				signal: abortControllerRef.current.signal,
			});

			if (!res.ok) {
				const errorText = await res.text().catch(() => "Unknown error");
				console.error(`[Sandbox] Ensure failed with status ${res.status}:`, errorText);
				throw new Error(`Status ${res.status}: ${errorText}`);
			}

			const data = await res.json();
			if (data.previewUrl) setPreviewUrl(data.previewUrl);

			// Success - reset and mark connected
			console.log(`[Sandbox] Connected successfully, preview URL: ${data.previewUrl}`);
			retryCountRef.current = 0;
			setSandboxStatus("connected");
			setHasConnectedOnce(true);
			setIsLoadingPreview(false);
		} catch (error: any) {
			// Ignore aborted requests
			if (error.name === "AbortError") {
				console.log(`[Sandbox] Connection aborted`);
				return;
			}

			console.error(`[Sandbox] Connection error:`, error);

			// Retry with exponential backoff
			retryCountRef.current++;
			if (retryCountRef.current < MAX_RETRIES) {
				const delay = Math.min(500 * Math.pow(1.5, retryCountRef.current), 5000);
				console.log(`[Sandbox] Retrying in ${delay}ms (attempt ${retryCountRef.current + 1}/${MAX_RETRIES})`);
				retryTimeoutRef.current = window.setTimeout(connectToSandbox, delay);
			} else {
				console.error(`[Sandbox] Failed after ${MAX_RETRIES} attempts`);
				// Even after max retries, hide the loading spinner so user can see the page
				setIsLoadingPreview(false);
			}
		} finally {
			isConnectingRef.current = false;
		}
	}, [projectId]);

	const startEnsureLoop = useCallback(() => {
		retryCountRef.current = 0;
		connectToSandbox();
	}, [connectToSandbox]);

	// Connect on mount
	useEffect(() => {
		// Check if projectId actually changed (vs React Strict Mode remount)
		const projectIdChanged = previousProjectIdRef.current !== null &&
		                         previousProjectIdRef.current !== projectId;

		if (projectIdChanged) {
			// Project changed - abort old connection and reset state
			console.log(`[Sandbox] Project changed from ${previousProjectIdRef.current} to ${projectId}`);
			abortControllerRef.current?.abort();
			retryCountRef.current = 0;
			setSandboxStatus("connecting");
			setHasConnectedOnce(false);
			setPreviewUrl(null);
			setIsLoadingPreview(true);
		}

		previousProjectIdRef.current = projectId;

		// Start connection if not already connecting
		if (!isConnectingRef.current) {
			console.log('[Sandbox] Effect running - starting ensure loop');
			startEnsureLoop();
		}

		return () => {
			// On cleanup, only clear timeout, don't abort in-flight requests
			// This prevents React Strict Mode from aborting connections
			if (retryTimeoutRef.current) {
				clearTimeout(retryTimeoutRef.current);
				retryTimeoutRef.current = null;
			}
			// Note: We intentionally DON'T abort the controller here to prevent
			// React Strict Mode from cancelling in-progress connections
			// The abort only happens when projectId actually changes (see above)
		};
	}, [projectId, startEnsureLoop]);

	// Reconnect when page becomes visible
	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible" && sandboxStatus !== "connected") {
				startEnsureLoop();
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
	}, [startEnsureLoop, sandboxStatus]);

	// Heartbeat to keep sandbox alive
	useEffect(() => {
		if (sandboxStatus !== "connected") {
			if (heartbeatIntervalRef.current) {
				clearInterval(heartbeatIntervalRef.current);
				heartbeatIntervalRef.current = null;
			}
			return;
		}

		if (heartbeatIntervalRef.current) return;

		const sendPing = async () => {
			try {
				await fetch(`/api/projects/${projectId}/sandbox/ping`, { method: "POST" });
			} catch (e) {
				// Ping failures are non-critical
			}
		};

		sendPing();
		heartbeatIntervalRef.current = window.setInterval(sendPing, HEARTBEAT_INTERVAL_MS);

		return () => {
			if (heartbeatIntervalRef.current) {
				clearInterval(heartbeatIntervalRef.current);
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
