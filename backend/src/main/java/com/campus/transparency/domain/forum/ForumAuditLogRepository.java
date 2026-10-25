package com.campus.transparency.domain.forum;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ForumAuditLogRepository extends JpaRepository<ForumAuditLog, Long> {

    Page<ForumAuditLog> findByOrganizationIdOrderByCreatedAtDesc(Long organizationId, Pageable pageable);

    Page<ForumAuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
