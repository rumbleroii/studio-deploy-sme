FROM docker.io/cloudflare/sandbox:0.6.6

# Create group and user with explicit IDs
ARG USER_UID=1000
ARG USER_GID=1000

RUN groupadd --gid ${USER_GID} claude && \
    useradd --uid ${USER_UID} --gid ${USER_GID} -m -s /bin/bash claude

# Pre-create all paths and set ownership in one layer
RUN mkdir -p /runner/working_directory /workspace/projects /home/claude/.claude && \
    chown -R claude:claude /runner /workspace /home/claude

# Use the user for COPY commands to avoid "root-owned" files
COPY --chown=claude:claude runner/.claude/ /runner/working_directory/.claude/
COPY --chown=claude:claude src/survey-app /runner/survey-app

# Set working directory so npm install happens as the user
WORKDIR /runner/survey-app
RUN npm install

WORKDIR /runner
COPY --chown=claude:claude runner/run_chat.ts /runner/run_chat.ts
COPY --chown=claude:claude runner/.claude/settings.json /home/claude/.claude/settings.json

# Build step
RUN npm init -y && npm pkg set type=module && \
    npm install @anthropic-ai/claude-agent-sdk@latest @anthropic-ai/claude-code@latest esbuild && \
    npx esbuild ./run_chat.ts --platform=node --format=esm --target=es2022 --outfile=./run_chat.js && \
    chmod +x ./run_chat.js && \
    chown -R claude:claude /runner

USER claude

EXPOSE 3000
EXPOSE 3001
