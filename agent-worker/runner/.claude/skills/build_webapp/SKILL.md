---
name: webapp-builder
description: Build fullstack webapps. Use this skill when creating interactive web applications.
---

# Webapp Builder

This skill enables you to create, run, and manage fullstack Next.js webapps within chat sessions.

## When to Use

Use this skill when the user asks you to:

- Create a web application or webapp
- Build an interactive UI or dashboard
- Create a prototype or demo
- Build something that needs to run in a browser

## Available MCP Tools

Use these tools to create and manage webapps:

| Tool                         | Description                               |
| ---------------------------- | ----------------------------------------- |
| `mcp__webapp__webapp_create` | Create a new Next.js webapp from template |
| `mcp__webapp__webapp_start`  | Start the development server with HMR     |
| `mcp__webapp__webapp_stop`   | Stop the development server               |
| `mcp__webapp__webapp_status` | Check if webapp exists and is running     |
| `mcp__webapp__webapp_url`    | Get the URL to access the webapp          |

**Important:** Always call `mcp__webapp__webapp_create` first, then `mcp__webapp__webapp_start` to get the webapp URL.

## Workflow

### 1. Create the Webapp

Use `webapp_create` to initialize a new Next.js project. This creates a webapp in the `webapp/` directory with:

- Next.js 14 with App Router
- Tailwind CSS with Metaforms brand colors
- Pre-installed dependencies (fast startup)

### 2. Start the Development Server

Use `webapp_start` to run the dev server. The server provides:

- Hot Module Replacement (HMR) - changes appear instantly
- Fast Refresh - React state preserved during edits
- Error overlay - see errors in the browser

### 3. Build the Application

Edit files in the `webapp/` directory:

**Main Files:**

- `webapp/app/page.jsx` - The main page component
- `webapp/app/layout.jsx` - Root layout (html, body)
- `webapp/app/globals.css` - Global styles with Tailwind

**Creating New Pages:**

- `webapp/app/about/page.jsx` -> `/about`
- `webapp/app/dashboard/page.jsx` -> `/dashboard`

**Links within the webapp:**

- Note that the root page will be `/apps/{sessionId}/`. So if you want to link to a page within the webapp (say, for navigation links), you need to prefix the link with `/apps/{sessionId}/`.

### 4. Share with User

After starting, share the webapp URL with the user. The URL format is `/apps/{sessionId}`. Always share as hyperlinks with user so that they can simply click to view.

## Code Patterns

### Basic Page Structure

```jsx
export default function Page() {
	return (
		<main className="min-h-screen p-8">
			<div className="card max-w-2xl mx-auto">
				<h1 className="text-2xl font-bold mb-4">Title</h1>
				<p className="text-white/70">Content here</p>
			</div>
		</main>
	);
}
```

### Using Brand Colors

```jsx
// Coral accent (primary)
<button className="bg-coral hover:bg-coral-600">Click me</button>
<span className="text-coral">Highlighted text</span>

// Burgundy background (secondary)
<div className="bg-burgundy">Dark section</div>
<div className="bg-burgundy-400">Lighter card</div>
```

### Pre-built CSS Classes

The template includes these utility classes:

- `.btn-primary` - Coral button with hover state
- `.btn-secondary` - Burgundy button with border
- `.card` - Glass-effect card container
- `.input` - Styled form input

### Client Components (for interactivity)

```jsx
"use client";

import { useState } from "react";

export default function Counter() {
	const [count, setCount] = useState(0);

	return (
		<button onClick={() => setCount((c) => c + 1)} className="btn-primary">
			Count: {count}
		</button>
	);
}
```

## Best Practices

1. **Start simple** - Get a basic version working first, then iterate
2. **Use the brand colors** - Coral for actions, burgundy for backgrounds
3. **Test incrementally** - HMR updates instantly, so save and check often
4. **Keep components small** - Easier to modify and debug
5. **Use Tailwind** - Faster than writing custom CSS

## Common Issues

### Webapp not loading

- Check if the server is running with `webapp_status`
- Try `webapp_stop` then `webapp_start` to restart

### Changes not appearing

- Make sure you saved the file
- Check for syntax errors in the terminal
- Try a hard refresh (Ctrl+Shift+R)
