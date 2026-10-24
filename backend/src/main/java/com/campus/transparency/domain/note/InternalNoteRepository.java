package com.campus.transparency.domain.note;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InternalNoteRepository extends JpaRepository<InternalNote, Long> {

    List<InternalNote> findByIssueIdAndOrganizationIdOrderByCreatedAtAsc(Long issueId, Long organizationId);

    Page<InternalNote> findByIssueIdAndOrganizationIdOrderByCreatedAtAsc(Long issueId, Long organizationId, Pageable pageable);

    Optional<InternalNote> findByIdAndOrganizationId(Long id, Long organizationId);

    Optional<InternalNote> findByIdAndIssueIdAndOrganizationId(Long id, Long issueId, Long organizationId);

    List<InternalNote> findByIssueIdOrderByCreatedAtAsc(Long issueId);

    Optional<InternalNote> findByIdAndIssueId(Long id, Long issueId);
}
