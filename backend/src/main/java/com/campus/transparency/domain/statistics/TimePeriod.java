package com.campus.transparency.domain.statistics;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;

public enum TimePeriod {
    ALL_TIME,
    LAST_30_DAYS,
    LAST_90_DAYS,
    CURRENT_YEAR;

    public Instant getStartInstant() {
        Instant now = Instant.now();
        return switch (this) {
            case LAST_30_DAYS -> now.minus(30, ChronoUnit.DAYS);
            case LAST_90_DAYS -> now.minus(90, ChronoUnit.DAYS);
            case CURRENT_YEAR -> LocalDate.now(ZoneOffset.UTC)
                    .withDayOfYear(1)
                    .atStartOfDay(ZoneOffset.UTC)
                    .toInstant();
            case ALL_TIME -> Instant.EPOCH;
        };
    }

    public static TimePeriod fromString(String val) {
        if (val == null || val.isBlank()) {
            return ALL_TIME;
        }
        try {
            return TimePeriod.valueOf(val.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return ALL_TIME;
        }
    }
}
