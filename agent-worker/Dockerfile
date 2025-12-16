# Use the official Cloudflare Sandbox image as a base.
# Match the npm package version (0.6.6).
FROM docker.io/cloudflare/sandbox:0.6.6

# Bake the runner + deps into the image (do NOT rely on global npm installs).
WORKDIR /runner
COPY src/runner.mjs ./run_chat.mjs
RUN npm init -y && npm install @anthropic-ai/claude-agent-sdk@0.1.70 @anthropic-ai/claude-code@2.0.70

# Ensure the runner is executable.
RUN chmod +x ./run_chat.mjs

# The Sandbox runtime listens on 3000 (internal control plane).
EXPOSE 3000
