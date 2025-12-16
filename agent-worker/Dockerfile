# Use the official Cloudflare Sandbox image as a base.
# Match the npm package version (0.6.6).
FROM docker.io/cloudflare/sandbox:0.6.6

# Install inotify-tools for realtime file system watching
RUN apt-get update && apt-get install -y --no-install-recommends inotify-tools \
  && rm -rf /var/lib/apt/lists/*

# Bake the runner + deps into the image (do NOT rely on global npm installs).
WORKDIR /runner
# Copy all source files
COPY runner/run_chat.ts ./run_chat.ts
COPY src/hello-world.mjs ./hello-world.mjs
# Install dependencies and build
RUN npm init -y \
  && npm pkg set type=module \
  && npm install @anthropic-ai/claude-agent-sdk@0.1.70 @anthropic-ai/claude-code@2.0.70 esbuild \
  && npx esbuild ./run_chat.ts --platform=node --format=esm --target=es2022 --outfile=./run_chat.js

# Ensure the runner is executable.
RUN chmod +x ./run_chat.js

# The Sandbox runtime listens on 3000 (internal control plane).
EXPOSE 3000
EXPOSE 3001