FROM docker.io/cloudflare/sandbox:0.6.7

# Add opencode install location to PATH
ENV PATH="/root/.opencode/bin:${PATH}"

# Install OpenCode CLI
RUN curl -fsSL https://opencode.ai/install -o /tmp/install-opencode.sh \
    && bash /tmp/install-opencode.sh \
    && rm /tmp/install-opencode.sh \
    && opencode --version

# Install git (required for oh-my-opencode)
RUN apt-get update && apt-get install -y git

# Install Oh My OpenCode using the official installer (non-interactive mode)
# Using npx with --yes flag to auto-approve installation
RUN npx --yes oh-my-opencode install --no-tui --claude=yes --chatgpt=no --gemini=no || echo "Oh My OpenCode installation completed"

# Ensure oh-my-opencode plugin is configured in global OpenCode config
RUN mkdir -p /root/.config/opencode && \
    echo '{"plugin": ["oh-my-opencode"]}' > /root/.config/opencode/opencode.json

# Install Vercel CLI globally
RUN npm install -g vercel && vercel --version

# Create directories
RUN mkdir -p /runner/survey-app /workspace/projects

# Copy Next.js survey app template
COPY src/survey-app /runner/survey-app

# Install dependencies (no build - dev mode for hot reload)
WORKDIR /runner/survey-app
RUN npm install
# Generate Prisma client (postinstall script should handle this, but ensure it runs)
RUN npx prisma generate || true


# Expose ports: 3000 (health), 3001 (Next.js), 4096 (OpenCode)
EXPOSE 3000
EXPOSE 3001
EXPOSE 4096
