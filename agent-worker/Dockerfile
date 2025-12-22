FROM docker.io/cloudflare/sandbox:0.6.7

# Add opencode install location to PATH
ENV PATH="/root/.opencode/bin:${PATH}"

# Install OpenCode CLI
RUN curl -fsSL https://opencode.ai/install -o /tmp/install-opencode.sh \
    && bash /tmp/install-opencode.sh \
    && rm /tmp/install-opencode.sh \
    && opencode --version

# Create directories
RUN mkdir -p /runner/survey-app /workspace/projects

# Copy Next.js survey app template
COPY src/survey-app /runner/survey-app

# Install dependencies (no build - dev mode for hot reload)
WORKDIR /runner/survey-app
RUN npm install

# Expose ports: 3000 (health), 3001 (Next.js), 4096 (OpenCode)
EXPOSE 3000
EXPOSE 3001
EXPOSE 4096
