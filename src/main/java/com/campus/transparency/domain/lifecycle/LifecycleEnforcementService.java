package com.campus.transparency.domain.lifecycle;

import com.campus.transparency.domain.issue.Issue;
import com.campus.transparency.domain.issue.IssueStatus;
import org.springframework.stereotype.Service;

@Service
public class LifecycleEnforcementService {

    public void enforce(Issue issue, IssueStatus next) {
        issue.transitionTo(next);
    }
}
