"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { Loader2 } from "lucide-react";
import type { FitAddon } from "@xterm/addon-fit";

interface TerminalPanelProps {
	projectId: string;
}

export function TerminalPanel({ projectId }: TerminalPanelProps) {
	const terminalRef = useRef<HTMLDivElement>(null);
	const xtermRef = useRef<XTerm | null>(null);
	const fitAddonRef = useRef<FitAddon | null>(null);
	const [isConnecting, setIsConnecting] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const currentLineRef = useRef<string>("");
	const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(
		null
	);
	const abortControllerRef = useRef<AbortController | null>(null);

	useEffect(() => {
		if (!terminalRef.current) return;

		let mounted = true;

		// Initialize terminal asynchronously to avoid SSR issues with FitAddon
		const initTerminal = async () => {
			// Dynamically import FitAddon only on client side
			const { FitAddon } = await import("@xterm/addon-fit");

			// Initialize xterm
			const term = new XTerm({
				cursorBlink: true,
				fontSize: 13,
				fontFamily: 'Menlo, Monaco, "Courier New", monospace',
				theme: {
					background: "#1e1e1e",
					foreground: "#d4d4d4",
					cursor: "#ffffff",
					black: "#000000",
					red: "#cd3131",
					green: "#0dbc79",
					yellow: "#e5e510",
					blue: "#2472c8",
					magenta: "#bc3fbc",
					cyan: "#11a8cd",
					white: "#e5e5e5",
					brightBlack: "#666666",
					brightRed: "#f14c4c",
					brightGreen: "#23d18b",
					brightYellow: "#f5f543",
					brightBlue: "#3b8eea",
					brightMagenta: "#d670d6",
					brightCyan: "#29b8db",
					brightWhite: "#e5e5e5",
				},
				rows: 24,
				cols: 80,
			});

			const fitAddon = new FitAddon();
			term.loadAddon(fitAddon);

			if (!terminalRef.current) return;
			term.open(terminalRef.current);

			// Small delay to ensure terminal is ready
			setTimeout(() => {
				if (mounted) {
					fitAddon.fit();
				}
			}, 100);

			xtermRef.current = term;
			fitAddonRef.current = fitAddon;

			// Handle resize
			const handleResize = () => {
				if (mounted) {
					fitAddon.fit();
				}
			};
			const resizeObserver = new ResizeObserver(handleResize);
			if (terminalRef.current) {
				resizeObserver.observe(terminalRef.current);
			}

			// Handle terminal input - buffer locally, echo locally, send on Enter
			term.onData((data) => {
				// Handle control characters
				if (data.length === 1) {
					const code = data.charCodeAt(0);

					// Handle Enter key (newline)
					if (code === 13) {
						term.write("\r\n");
						const command = currentLineRef.current;
						currentLineRef.current = "";
						sendInput(command + "\n");
						return;
					}
					// Handle Backspace
					else if (code === 127 || code === 8) {
						if (currentLineRef.current.length > 0) {
							currentLineRef.current = currentLineRef.current.slice(0, -1);
							term.write("\b \b");
						}
						return;
					}
					// Handle Ctrl+C
					else if (code === 3) {
						term.write("^C\r\n");
						currentLineRef.current = "";
						sendInput("\x03");
						return;
					}
					// Handle Ctrl+D
					else if (code === 4) {
						term.write("^D\r\n");
						currentLineRef.current = "";
						sendInput("\x04");
						return;
					}
					// Handle other control characters
					else if (code < 32) {
						return;
					}
				}

				// For printable characters, echo locally and add to buffer
				// Command will be sent on Enter
				currentLineRef.current += data;
				term.write(data);
			});

			// Connect to the terminal stream
			connectToTerminal();

			return () => {
				// Cleanup
				mounted = false;
				if (abortControllerRef.current) {
					abortControllerRef.current.abort();
				}
				if (readerRef.current) {
					readerRef.current.cancel();
				}
				resizeObserver.disconnect();
				term.dispose();
			};
		};

		initTerminal();
	}, [projectId]);

	const connectToTerminal = async () => {
		setIsConnecting(true);
		setError(null);

		try {
			const abortController = new AbortController();
			abortControllerRef.current = abortController;

			console.log("Connecting to terminal for project:", projectId);

			const response = await fetch(`/api/projects/${projectId}/terminal`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					cols: xtermRef.current?.cols || 80,
					rows: xtermRef.current?.rows || 24,
				}),
				signal: abortController.signal,
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error(
					"Terminal connection failed:",
					response.status,
					errorText
				);
				throw new Error(`Failed to connect: ${response.statusText}`);
			}

			if (!response.body) {
				throw new Error("Response body is null");
			}

			console.log("Terminal connected, starting to read stream");

			// Set a timeout to hide the spinner if no content arrives within 3 seconds
			const spinnerTimeout = setTimeout(() => {
				console.log("Timeout reached, hiding spinner");
				setIsConnecting(false);
			}, 3000);

			// Send an initial newline to trigger the prompt
			setTimeout(() => {
				sendInput("\n");
			}, 500);

			// Read the stream
			const reader = response.body.getReader();
			readerRef.current = reader;
			const decoder = new TextDecoder();

			let firstChunkReceived = false;

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						console.log("Terminal stream ended");
						break;
					}

					const text = decoder.decode(value, { stream: true });
					if (xtermRef.current && !abortController.signal.aborted) {
						// Simple approach: write everything - let backend handle rendering
						// The local echo is for immediate feedback, backend will overwrite/render properly
						xtermRef.current.write(text);

						// Hide loading spinner after first content arrives
						if (!firstChunkReceived && text.length > 0) {
							firstChunkReceived = true;
							clearTimeout(spinnerTimeout);
							setIsConnecting(false);
						}
					}
				}
			} catch (readError: any) {
				if (readError.name !== "AbortError") {
					console.error("Stream read error:", readError);
				}
			} finally {
				clearTimeout(spinnerTimeout);
			}
		} catch (err: any) {
			if (err.name !== "AbortError") {
				console.error("Terminal connection error:", err);
				setError(err.message || "Failed to connect to terminal");
				setIsConnecting(false);
			}
		}
	};

	const sendInput = async (data: string) => {
		try {
			const response = await fetch(
				`/api/projects/${projectId}/terminal/input`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ input: data }),
				}
			);

			if (!response.ok) {
				console.error(
					"Failed to send input:",
					response.status,
					await response.text()
				);
			}
		} catch (err) {
			console.error("Failed to send input:", err);
		}
	};

	if (error) {
		return (
			<div className="flex items-center justify-center h-full bg-gray-900 text-red-400 p-4">
				<div className="text-center">
					<p className="font-mono text-sm">Terminal Error</p>
					<p className="font-mono text-xs mt-2">{error}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="relative h-full bg-gray-900 overflow-hidden">
			{isConnecting && (
				<div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
					<div className="text-center">
						<Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto mb-2" />
						<p className="text-xs text-gray-400 font-mono">
							Connecting to terminal...
						</p>
					</div>
				</div>
			)}
			<div ref={terminalRef} className="absolute inset-0 p-2" />
		</div>
	);
}
