# Step 1: Use the official Bun image
FROM oven/bun:1.1.37

# Step 2: Set the working directory in the container
WORKDIR /app

# Step 3: Copy the application files into the container
COPY . .

# Step 4: Install Bun dependencies
RUN bun install

# Step 5: Run the application
CMD ["bun", "src/server.ts"]