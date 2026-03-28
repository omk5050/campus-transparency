package com.campus.transparency.domain.issue;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;

public interface IssueRepository extends JpaRepository<Issue, Long>, JpaSpecificationExecutor<Issue> {

    /**
     * Public read path.
     * Hidden issues MUST NOT be exposed.
     */
    Page<Issue> findByHiddenFalse(Pageable pageable);

    /**
     * Admin / authority read path.
     * Includes hidden issues.
     */
    @Query("select i from Issue i")
    Page<Issue> findAllIncludingHidden(Pageable pageable);

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
