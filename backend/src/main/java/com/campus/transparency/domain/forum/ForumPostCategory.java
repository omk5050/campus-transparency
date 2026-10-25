package com.campus.transparency.domain.forum;

public enum ForumPostCategory {
    GENERAL,
    SUGGESTION,
    QUESTION,
    DISCUSSION,
    FEEDBACK;

    public static ForumPostCategory fromString(String val) {
        if (val == null || val.trim().isEmpty()) {
            return GENERAL;
        }
        try {
            return ForumPostCategory.valueOf(val.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid forum post category: " + val);
        }
    }
}
