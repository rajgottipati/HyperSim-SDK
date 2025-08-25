# Dockerfile for HyperSim Java SDK
FROM openjdk:21-jdk-slim

# Install Maven
RUN apt-get update && apt-get install -y maven && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy POM file
COPY pom.xml .

# Download dependencies
RUN mvn dependency:go-offline -B

# Copy source code
COPY src ./src

# Build the project
RUN mvn clean compile

# Run tests
RUN mvn test

# Package the application
RUN mvn package -DskipTests

# Set the entry point
ENTRYPOINT ["java", "--enable-preview", "-cp", "target/classes:target/dependency/*", "io.hypersim.sdk.examples.ComprehensiveUsageExample"]
