# Use the official Cloudflare Sandbox image as a base.
# Match the npm package version (0.6.6).
#
# Cloudflare's runtime is linux/amd64. On Apple Silicon (arm64), Docker needs
# emulation to build/run this image locally, so we pin the platform.
FROM --platform=linux/amd64 docker.io/cloudflare/sandbox:0.6.6

# Reduce baseline memory usage for local dev (especially on Apple Silicon running amd64).
# These env vars are respected by the sandbox base image to control runtime pools.
ENV JAVASCRIPT_POOL_MIN_SIZE=0
ENV TYPESCRIPT_POOL_MIN_SIZE=0
ENV PYTHON_POOL_MIN_SIZE=0

# Install inotify-tools for realtime file system watching
RUN apt-get update && apt-get install -y --no-install-recommends inotify-tools \
  && rm -rf /var/lib/apt/lists/*

# Bake the runner + deps into the image (do NOT rely on global npm installs).
RUN mkdir -p /runner
# Bake a template .claude directory used by the runner to initialize projects.
RUN mkdir -p /runner/working_directory
COPY runner/.claude/ /runner/working_directory/.claude/
# Copy runner source
COPY runner/run_chat.ts /runner/run_chat.ts
# Install dependencies and build (keep the base image runtime WORKDIR intact).
RUN cd /runner \
  && npm init -y \
  && npm pkg set type=module \
  && npm install @anthropic-ai/claude-agent-sdk@0.1.70 @anthropic-ai/claude-code@2.0.70 esbuild \
  && npx esbuild ./run_chat.ts --platform=node --format=esm --target=es2022 --outfile=./run_chat.js \
  && chmod +x ./run_chat.js

# The Sandbox runtime listens on 3000 (internal control plane).
EXPOSE 3000
EXPOSE 3001

# The base image entrypoint is the Bun runtime binary at /container-server/sandbox.
# It needs a command to start the container control-plane server on port 3000.
CMD ["run", "/container-server/dist/index.js"]