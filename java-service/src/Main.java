import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

/**
 * Minimal dependency-free Java HTTP service.
 *
 * Deliberately avoids Maven/Gradle and third-party libraries: it builds and
 * runs with nothing but a JDK, which keeps the Dockerfile a single-stage
 * `javac` + `java` and avoids depending on Maven Central being reachable at
 * build time (handy in locked-down CI runners or offline environments).
 */
public class Main {

    private static final String APP_VERSION = System.getenv().getOrDefault("APP_VERSION", "0.1.0");

    public static void main(String[] args) throws IOException {
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8081"));

        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/", new IndexHandler());
        server.createContext("/healthz", new SimpleStatusHandler("ok"));
        server.createContext("/readyz", new SimpleStatusHandler("ready"));
        server.setExecutor(null);
        server.start();

        System.out.println("java-service listening on port " + port);
    }

    static class IndexHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String hostname = System.getenv().getOrDefault("HOSTNAME", "unknown");
            String body = "{"
                    + "\"message\":\"Hello from the Java microservice\","
                    + "\"version\":\"" + APP_VERSION + "\","
                    + "\"hostname\":\"" + hostname + "\""
                    + "}";
            sendJson(exchange, 200, body);
        }
    }

    static class SimpleStatusHandler implements HttpHandler {
        private final String status;

        SimpleStatusHandler(String status) {
            this.status = status;
        }

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            sendJson(exchange, 200, "{\"status\":\"" + status + "\"}");
        }
    }

    private static void sendJson(HttpExchange exchange, int code, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(code, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }
}
