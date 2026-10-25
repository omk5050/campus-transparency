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
        boolean isTest = isTestContext(environment, application);

        Path[] searchPaths = new Path[]{
            Path.of(".env"),
            Path.of("../.env"),
            Path.of("backend/.env")
        };

        for (Path path : searchPaths) {
            if (Files.isRegularFile(path)) {
                loadEnvFile(path, environment, isTest);
                break;
            }
        }

        if (isTest) {
            String resolvedUrl = environment.getProperty("spring.datasource.url");
            if (resolvedUrl != null && isProductionDatabase(resolvedUrl)) {
                throw new IllegalStateException(
                    "CRITICAL SECURITY VIOLATION: Test context detected production Neon database URL: " + resolvedUrl +
                    ". Automated tests are strictly prohibited from connecting to production/Neon databases."
                );
            }
        }
    }

    public static boolean isProductionDatabase(String url) {
        if (url == null) return false;
        String lower = url.toLowerCase();
        return lower.contains("neon.tech") || 
               lower.contains("ep-mute-unit-a14szfx7") ||
               (lower.contains("neondb") && lower.contains("aws"));
    }

    private boolean isTestContext(ConfigurableEnvironment environment, SpringApplication application) {
        for (String profile : environment.getActiveProfiles()) {
            if ("test".equalsIgnoreCase(profile)) {
                return true;
            }
        }
        String appName = environment.getProperty("spring.application.name", "");
        if (appName.toLowerCase().contains("test")) {
            return true;
        }
        for (StackTraceElement ste : Thread.currentThread().getStackTrace()) {
            String cls = ste.getClassName();
            if (cls.startsWith("org.junit") || 
                cls.contains("TestContextManager") || 
                cls.contains("SpringBootTestContextBootstrapper") ||
                cls.contains("surefire")) {
                return true;
            }
        }
        if (System.getProperty("surefire.test.class.path") != null ||
            System.getProperty("org.springframework.test.context.SpringBootTest") != null) {
            return true;
        }
        return false;
    }

    private void loadEnvFile(Path envFile, ConfigurableEnvironment environment, boolean isTest) {
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

                // SECURITY GUARD: Never load or inject production datasource in test contexts
                if (isTest) {
                    String upperKey = key.toUpperCase();
                    if (upperKey.startsWith("SPRING_DATASOURCE") || 
                        upperKey.contains("DATASOURCE") || 
                        upperKey.equals("DATABASE_URL")) {
                        continue;
                    }
                }

                props.put(key, value);
                if (System.getProperty(key) == null) {
                    System.setProperty(key, value);
                }
                if (!isTest) {
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
            }

            if (isTest) {
                System.clearProperty("spring.datasource.url");
                System.clearProperty("spring.datasource.username");
                System.clearProperty("spring.datasource.password");
                System.clearProperty("SPRING_DATASOURCE_URL");
                System.clearProperty("SPRING_DATASOURCE_USERNAME");
                System.clearProperty("SPRING_DATASOURCE_PASSWORD");
            }

            if (!props.isEmpty()) {
                environment.getPropertySources().addFirst(new MapPropertySource("dotenvProperties", props));
            }
        } catch (IOException ignored) {
        }
    }
}
