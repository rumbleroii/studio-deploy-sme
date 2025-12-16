# Use the official Cloudflare Sandbox image as a base.
# Match the npm package version (0.6.6).
FROM docker.io/cloudflare/sandbox:0.6.6

# Bake the runner + deps into the image (do NOT rely on global npm installs).
WORKDIR /runner
COPY runner/run_chat.ts ./run_chat.ts
COPY runner/.claude ./working_directory/.claude
RUN npm init -y \
  && npm pkg set type=module \
  && npm install @anthropic-ai/claude-agent-sdk@0.1.70 @anthropic-ai/claude-code@2.0.70 esbuild \
  && npx esbuild ./run_chat.ts --platform=node --format=esm --target=es2022 --outfile=./run_chat.js

# Ensure the runner is executable.
RUN chmod +x ./run_chat.js

# The Sandbox runtime listens on 3000 (internal control plane).
EXPOSE 3000
