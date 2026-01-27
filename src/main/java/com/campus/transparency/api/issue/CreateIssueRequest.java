package com.campus.transparency.api.issue;

public record CreateIssueRequest(
        String title,
        String description,
        String reporterHash
) {}
