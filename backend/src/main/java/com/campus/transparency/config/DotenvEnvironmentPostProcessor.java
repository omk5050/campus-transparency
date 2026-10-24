package com.campus.transparency.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Loads configuration from a local .env file into the Spring environment if present.
 * Runs at highest precedence so properties are available before application.yml resolves.
 */
public class DotenvEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Path[] searchPaths = new Path[]{
            Path.of(".env"),
            Path.of("../.env"),
            Path.of("backend/.env")
        };

        for (Path path : searchPaths) {
            if (Files.isRegularFile(path)) {
                loadEnvFile(path, environment);
                break;
            }
        }
    }

    private void loadEnvFile(Path envFile, ConfigurableEnvironment environment) {
        try {
            List<String> lines = Files.readAllLines(envFile);
            Map<String, Object> props = new HashMap<>();
            for (String rawLine : lines) {
                String line = rawLine.trim();
                if (line.isEmpty() || line.startsWith("#") || !line.contains("=")) {
                    continue;
                }
                int idx = line.indexOf('=');
                String key = line.substring(0, idx).trim();
                String value = line.substring(idx + 1).trim();
                if ((value.startsWith("\"") && value.endsWith("\"")) ||
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.substring(1, value.length() - 1);
                }
                props.put(key, value);
                if (System.getProperty(key) == null) {
                    System.setProperty(key, value);
                }
                if (key.equalsIgnoreCase("SPRING_DATASOURCE_URL")) {
                    System.setProperty("spring.datasource.url", value);
                }
                if (key.equalsIgnoreCase("SPRING_DATASOURCE_USERNAME")) {
                    System.setProperty("spring.datasource.username", value);
                }
                if (key.equalsIgnoreCase("SPRING_DATASOURCE_PASSWORD")) {
                    System.setProperty("spring.datasource.password", value);
                }
            }
            if (!props.isEmpty()) {
                environment.getPropertySources().addFirst(new MapPropertySource("dotenvProperties", props));
            }
        } catch (IOException ignored) {
        }
    }
}
