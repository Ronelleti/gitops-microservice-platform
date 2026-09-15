# Single JDK image: compile with javac, run with java. No Maven/Gradle needed
# since the service has zero third-party dependencies.
FROM eclipse-temurin:21-jdk-alpine

WORKDIR /app
COPY src/Main.java .

RUN javac Main.java

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

ENV PORT=8081
EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8081/healthz || exit 1

CMD ["java", "Main"]
