package com.campus.transparency.domain.lifecycle;


import com.campus.transparency.domain.issue.IssueStatus;

import java.util.Set;

public final class IssueLifecyclePolicy {

    private IssueLifecyclePolicy() {}

    public static Set<IssueStatus> allowedNext(IssueStatus current) {
        return switch (current) {
            case REPORTED -> Set.of(IssueStatus.UNDER_REVIEW);
            case UNDER_REVIEW -> Set.of(
                    IssueStatus.IN_PROGRESS,
                    IssueStatus.REJECTED
            );
            case IN_PROGRESS -> Set.of(
                    IssueStatus.RESOLVED,
                    IssueStatus.REJECTED
            );
            case RESOLVED, REJECTED -> Set.of();
        };
    }

    public static boolean canTransition(IssueStatus from, IssueStatus to) {
        return allowedNext(from).contains(to);
    }
}
