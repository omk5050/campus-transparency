package com.campus.transparency.application.issue;

import org.springframework.stereotype.Service;
import java.security.SecureRandom;
import java.util.UUID;

@Service
public class AnonymousTagService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    /**
     * Generates a complaint-specific privacy-preserving pseudonym.
     * Format: "Complainant #XXXX" (e.g. "Complainant #8F4C").
     * Uses cryptographic entropy uniquely randomized per complaint
     * to eliminate cross-report correlation attacks.
     */
    public static String generateComplaintPseudonym() {
        int code = SECURE_RANDOM.nextInt(0x10000);
        return String.format("Complainant #%04X", code);
    }

    /**
     * Generates a complaint-isolated opaque hash token.
     * Guarantees that internal storage cannot be correlated across reports even if
     * an attacker analyzes raw database records.
     */
    public static String generateIsolatedReporterHash() {
        return "anon_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }

    /**
     * Fallback deterministic alias generation for legacy scenarios.
     */
    public String generateAlias(String reporterHash, Long issueId) {
        if (reporterHash == null) reporterHash = "unknown";
        int hash = Math.abs((reporterHash + issueId).hashCode()) % 0x10000;
        return String.format("Complainant #%04X", hash);
    }
}
