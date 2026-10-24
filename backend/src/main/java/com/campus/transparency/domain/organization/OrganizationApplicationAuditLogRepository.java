package com.campus.transparency.domain.organization;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrganizationApplicationAuditLogRepository extends JpaRepository<OrganizationApplicationAuditLog, Long> {
    List<OrganizationApplicationAuditLog> findByApplicationIdOrderByCreatedAtDesc(Long applicationId);
}
