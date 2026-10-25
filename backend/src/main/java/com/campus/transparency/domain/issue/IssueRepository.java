package com.campus.transparency.domain.issue;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;

public interface IssueRepository extends JpaRepository<Issue, Long>, JpaSpecificationExecutor<Issue> {


    //Public read path.
    //Hidden issues MUST NOT be exposed.
     
    Page<Issue> findByHiddenFalse(Pageable pageable);

    java.util.Optional<Issue> findByTrackingCode(String trackingCode);
    java.util.Optional<Issue> findByIdAndOrganizationId(Long id, Long organizationId);

    //Admin / authority read path.
    //Includes hidden issues.
     
    @Query("select i from Issue i")
    Page<Issue> findAllIncludingHidden(Pageable pageable);

    //Escalation: unresolved issues older than given timestamp.
    //Used for 7-day and 14-day accountability checks. 
    @Query("""
        select i from Issue i
        where i.hidden = false
          and i.status <> com.campus.transparency.domain.issue.IssueStatus.RESOLVED
          and i.status <> com.campus.transparency.domain.issue.IssueStatus.REJECTED
          and i.createdAt < :cutoff
    """)
    List<Issue> findUnresolvedOlderThan(Instant cutoff);

    long countByOrganizationId(Long organizationId);
    long countByOrganizationIdAndStatus(Long organizationId, IssueStatus status);
    long countByOrganizationIdAndAssignedToIsNotNull(Long organizationId);
    long countByOrganizationIdAndAssignedToIsNull(Long organizationId);

    long countByOrganizationIdAndCreatedAtGreaterThanEqual(Long organizationId, Instant since);
    long countByOrganizationIdAndStatusAndCreatedAtGreaterThanEqual(Long organizationId, IssueStatus status, Instant since);
    long countByOrganizationIdAndAssignedToIsNotNullAndCreatedAtGreaterThanEqual(Long organizationId, Instant since);
    long countByOrganizationIdAndAssignedToIsNullAndCreatedAtGreaterThanEqual(Long organizationId, Instant since);

    @Query("""
        select i.category, count(i) from Issue i
        where i.organization.id = :orgId and i.createdAt >= :since
        group by i.category
    """)
    List<Object[]> countGroupedByCategory(Long orgId, Instant since);

    @Query("""
        select i.department, count(i) from Issue i
        where i.organization.id = :orgId and i.createdAt >= :since
        group by i.department
    """)
    List<Object[]> countGroupedByDepartment(Long orgId, Instant since);

    @Query("""
        select i from Issue i
        where i.organization.id = :orgId
          and i.status = com.campus.transparency.domain.issue.IssueStatus.RESOLVED
          and i.createdAt >= :since
    """)
    List<Issue> findResolvedByOrganizationIdAndPeriod(Long orgId, Instant since);

    long countByCreatedAtGreaterThanEqual(Instant since);
    long countByStatusAndCreatedAtGreaterThanEqual(IssueStatus status, Instant since);

    @Query("""
        select i from Issue i
        where i.status = com.campus.transparency.domain.issue.IssueStatus.RESOLVED
          and i.createdAt >= :since
    """)
    List<Issue> findAllResolvedByPeriod(Instant since);

    @Query("""
        select i.organization.id, i.status, count(i)
        from Issue i
        where i.organization.status = com.campus.transparency.domain.organization.OrganizationStatus.ACTIVE
          and i.createdAt >= :since
        group by i.organization.id, i.status
    """)
    List<Object[]> countActiveGroupedByOrgAndStatus(Instant since);

    @Query("""
        select i from Issue i
        where i.organization.status = com.campus.transparency.domain.organization.OrganizationStatus.ACTIVE
          and i.status = com.campus.transparency.domain.issue.IssueStatus.RESOLVED
          and i.createdAt >= :since
    """)
    List<Issue> findActiveResolvedByPeriod(Instant since);
}
