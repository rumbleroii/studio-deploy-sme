"use client";

import { memo, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownMessageProps {
	content: string;
	className?: string;
}

export const MarkdownMessage = memo(function MarkdownMessage({
	content,
	className,
}: MarkdownMessageProps) {
	return (
		<div className={cn("text-sm leading-7 text-gray-900", className)}>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={{
					p: ({ children }: { children?: ReactNode }) => (
						<p className="my-2 first:mt-0 last:mb-0 whitespace-pre-wrap">
							{children}
						</p>
					),
					a: ({ children, href }: { children?: ReactNode; href?: string }) => (
						<a
							href={href}
							target="_blank"
							rel="noreferrer"
							className="text-burgundy-500 underline underline-offset-2 hover:text-burgundy-400"
						>
							{children}
						</a>
					),
					strong: ({ children }: { children?: ReactNode }) => (
						<strong className="font-semibold">{children}</strong>
					),
					em: ({ children }: { children?: ReactNode }) => (
						<em className="italic">{children}</em>
					),
					h1: ({ children }: { children?: ReactNode }) => (
						<h1 className="mt-4 mb-2 text-base font-semibold leading-6">
							{children}
						</h1>
					),
					h2: ({ children }: { children?: ReactNode }) => (
						<h2 className="mt-4 mb-2 text-sm font-semibold tracking-tight">
							{children}
						</h2>
					),
					h3: ({ children }: { children?: ReactNode }) => (
						<h3 className="mt-3 mb-1 text-sm font-semibold">{children}</h3>
					),
					ul: ({ children }: { children?: ReactNode }) => (
						<ul className="my-2 pl-5 list-disc space-y-1">{children}</ul>
					),
					ol: ({ children }: { children?: ReactNode }) => (
						<ol className="my-2 pl-5 list-decimal space-y-1">{children}</ol>
					),
					li: ({ children }: { children?: ReactNode }) => (
						<li className="leading-7 whitespace-pre-wrap">{children}</li>
					),
					hr: () => <hr className="my-4 border-gray-200" />,
					blockquote: ({ children }: { children?: ReactNode }) => (
						<blockquote className="my-3 border-l-2 border-gray-200 pl-4 text-gray-700">
							{children}
						</blockquote>
					),
					code: ({
						children,
						className: codeClassName,
					}: {
						children?: ReactNode;
						className?: string;
					}) => {
						const isBlock =
							typeof codeClassName === "string" &&
							/language-/.test(codeClassName);
						if (isBlock) {
							// react-markdown wraps block code in <pre><code>, so style is handled by <pre>
							return (
								<code className={cn("font-mono text-xs", codeClassName)}>
									{children}
								</code>
							);
						}
						return (
							<code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs text-gray-900">
								{children}
							</code>
						);
					},
					pre: ({ children }: { children?: ReactNode }) => (
						<pre className="my-3 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs leading-5">
							{children}
						</pre>
					),
					table: ({ children }: { children?: ReactNode }) => (
						<div className="my-3 overflow-x-auto">
							<table className="w-full border-collapse text-sm">
								{children}
							</table>
						</div>
					),
					th: ({ children }: { children?: ReactNode }) => (
						<th className="border border-gray-200 bg-gray-50 px-2 py-1 text-left font-medium">
							{children}
						</th>
					),
					td: ({ children }: { children?: ReactNode }) => (
						<td className="border border-gray-200 px-2 py-1 align-top">
							{children}
						</td>
					),
				}}
			>
				{content}
			</ReactMarkdown>
		</div>
	);
});
