# Use the official Cloudflare Sandbox image as a base.
FROM docker.io/cloudflare/sandbox:0.6.6

# Create a non-root user (required for --dangerously-skip-permissions)
RUN useradd -m -s /bin/bash claude && \
    mkdir -p /runner/working_directory && \
    mkdir -p /workspace && \
    chown -R claude:claude /runner /workspace

# Bake a template .claude directory used by the runner to initialize projects
COPY --chown=claude:claude runner/.claude/ /runner/working_directory/.claude/

# Copy Next.js template and pre-install dependencies
COPY --chown=claude:claude src/survey-app /runner/survey-app
RUN cd /runner/survey-app && npm install

# Copy runner source
COPY --chown=claude:claude runner/run_chat.ts /runner/run_chat.ts

# Copy settings to user-level config for permissions support
RUN mkdir -p /home/claude/.claude && chown -R claude:claude /home/claude
COPY --chown=claude:claude runner/.claude/settings.json /home/claude/.claude/settings.json

# Install dependencies and build (use latest SDK versions)
RUN cd /runner \
  && npm init -y \
  && npm pkg set type=module \
  && npm install @anthropic-ai/claude-agent-sdk@latest @anthropic-ai/claude-code@latest esbuild \
  && npx esbuild ./run_chat.ts --platform=node --format=esm --target=es2022 --outfile=./run_chat.js \
  && chmod +x ./run_chat.js \
  && chown -R claude:claude /runner

# Switch to non-root user
USER claude

EXPOSE 3000
EXPOSE 3001
