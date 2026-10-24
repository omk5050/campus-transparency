package com.campus.transparency.domain.attachment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IssueAttachmentRepository extends JpaRepository<IssueAttachment, Long> {

    List<IssueAttachment> findByIssueIdOrderByCreatedAtDesc(Long issueId);

    List<IssueAttachment> findByIssueIdAndOrganizationIdOrderByCreatedAtDesc(Long issueId, Long organizationId);

    Optional<IssueAttachment> findByIdAndIssueId(Long id, Long issueId);

    Optional<IssueAttachment> findByIdAndIssueIdAndOrganizationId(Long id, Long issueId, Long organizationId);
}
