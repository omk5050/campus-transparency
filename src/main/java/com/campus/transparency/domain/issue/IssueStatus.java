package com.campus.transparency.domain.issue;

public enum IssueStatus {

    REPORTED,
    UNDER_REVIEW,
    IN_PROGRESS,
    RESOLVED,
    REJECTED;

    public boolean isTerminal() {
        return this == RESOLVED || this == REJECTED;
    }
}
