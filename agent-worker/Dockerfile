# Use the official Cloudflare Sandbox image as a base.
FROM docker.io/cloudflare/sandbox:0.6.6

# Create runner directory and copy files
RUN mkdir -p /runner/working_directory
COPY runner/run_chat.ts /runner/run_chat.ts
COPY runner/.claude /runner/working_directory/.claude

# Copy Next.js template and pre-install dependencies
COPY src/survey-app /runner/survey-app
RUN cd /runner/survey-app && npm install

# Install runner dependencies and build
RUN cd /runner \
  && npm init -y \
  && npm pkg set type=module \
  && npm install @anthropic-ai/claude-agent-sdk@0.1.71 @anthropic-ai/claude-code@2.0.70 esbuild \
  && npx esbuild ./run_chat.ts --platform=node --format=esm --target=es2022 --outfile=./run_chat.js \
  && chmod +x ./run_chat.js

EXPOSE 3000
EXPOSE 3001
