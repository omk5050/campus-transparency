package com.campus.transparency.config;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

/**
 * Utility to load environment variables from local .env files into JVM system properties.
 * Enables zero-credential source code and test configuration.
 */
public final class DotenvLoader {

    private static boolean loaded = false;

    private DotenvLoader() {}

    public static synchronized void load() {
        if (loaded) {
            return;
        }

        Path[] searchPaths = new Path[]{
            Path.of(".env"),
            Path.of("../.env"),
            Path.of("backend/.env"),
            Path.of("../../.env")
        };

        for (Path path : searchPaths) {
            if (Files.isRegularFile(path)) {
                try {
                    List<String> lines = Files.readAllLines(path);
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
                    loaded = true;
                    break;
                } catch (IOException ignored) {}
            }
        }
    }
}
