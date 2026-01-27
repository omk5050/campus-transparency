package com.campus.transparency.domain.issue;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;

public interface IssueRepository extends JpaRepository<Issue, Long> {

    /**
     * Public read path.
     * Hidden issues MUST NOT be exposed.
     */
    List<Issue> findByHiddenFalse();

    /**
     * Admin / authority read path.
     * Includes hidden issues.
     */
    @Query("select i from Issue i")
    List<Issue> findAllIncludingHidden();

    /**
     * Escalation: unresolved issues older than given timestamp.
     * Used for 7-day and 14-day accountability checks.
     */
    @Query("""
        select i from Issue i
        where i.hidden = false
          and i.status <> com.campus.transparency.domain.issue.IssueStatus.RESOLVED
          and i.status <> com.campus.transparency.domain.issue.IssueStatus.REJECTED
          and i.createdAt < :cutoff
    """)
    List<Issue> findUnresolvedOlderThan(Instant cutoff);
}
