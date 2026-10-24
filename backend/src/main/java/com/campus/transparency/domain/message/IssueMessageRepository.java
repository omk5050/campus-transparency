package com.campus.transparency.domain.message;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IssueMessageRepository extends JpaRepository<IssueMessage, Long> {

    List<IssueMessage> findByIssueIdAndOrganizationIdOrderByCreatedAtAsc(Long issueId, Long organizationId);

    Page<IssueMessage> findByIssueIdAndOrganizationIdOrderByCreatedAtAsc(Long issueId, Long organizationId, Pageable pageable);

    Optional<IssueMessage> findByIdAndOrganizationId(Long id, Long organizationId);

    Optional<IssueMessage> findByIdAndIssueIdAndOrganizationId(Long id, Long issueId, Long organizationId);

    List<IssueMessage> findByIssueIdOrderByCreatedAtAsc(Long issueId);

    Optional<IssueMessage> findByIdAndIssueId(Long id, Long issueId);
}
