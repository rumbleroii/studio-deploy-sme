"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export type SandboxStatus = "connecting" | "connected";

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

	const startEnsureLoop = useCallback(() => {
		if (ensureActiveRef.current) return;
		ensureActiveRef.current = true;

		ensureBackoffMsRef.current = 500;
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
		ensureActiveRef.current = false;
		startEnsureLoop();

		return () => {
			if (ensureTimeoutRef.current) {
				window.clearTimeout(ensureTimeoutRef.current);
				ensureTimeoutRef.current = null;
			}
			ensureAbortRef.current?.abort();
			ensureAbortRef.current = null;
			ensureActiveRef.current = false;
		};
	}, [startEnsureLoop]);

	return {
		sandboxStatus,
		hasConnectedOnce,
		previewUrl,
		isLoadingPreview,
		startEnsureLoop,
	};
}
