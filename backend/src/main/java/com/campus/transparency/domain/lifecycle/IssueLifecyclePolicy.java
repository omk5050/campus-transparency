package com.campus.transparency.domain.lifecycle;


import com.campus.transparency.domain.issue.IssueStatus;

import java.util.Set;

public final class IssueLifecyclePolicy {

    private IssueLifecyclePolicy() {}

    public static Set<IssueStatus> allowedNext(IssueStatus current) {
        return switch (current) {
            case REPORTED -> Set.of(
                    IssueStatus.UNDER_REVIEW,
                    IssueStatus.IN_PROGRESS,
                    IssueStatus.REJECTED
            );
            case UNDER_REVIEW -> Set.of(
                    IssueStatus.IN_PROGRESS,
                    IssueStatus.REJECTED
            );
            case IN_PROGRESS -> Set.of(
                    IssueStatus.RESOLVED,
                    IssueStatus.REJECTED
            );
            case RESOLVED -> Set.of(
                    IssueStatus.REJECTED,
                    IssueStatus.IN_PROGRESS
            );
            case REJECTED -> Set.of(
                    IssueStatus.IN_PROGRESS,
                    IssueStatus.RESOLVED
            );
        };
    }

    public static boolean canTransition(IssueStatus from, IssueStatus to) {
        if (from == to) return true;
        return allowedNext(from).contains(to);
    }
}
