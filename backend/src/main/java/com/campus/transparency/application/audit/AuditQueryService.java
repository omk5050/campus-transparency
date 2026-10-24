package com.campus.transparency.application.audit;

import com.campus.transparency.domain.audit.AuditLogRepository;
import com.campus.transparency.security.CurrentUserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AuditQueryService {

    private final AuditLogRepository auditLogRepository;
    private final CurrentUserService currentUserService;

    public AuditQueryService(AuditLogRepository auditLogRepository, CurrentUserService currentUserService) {
        this.auditLogRepository = auditLogRepository;
        this.currentUserService = currentUserService;
    }

    public Page<AuditLogResponse> getRecentAuditLogs(Pageable pageable) {
        Long orgId = null;
        try {
            orgId = currentUserService.getCurrentOrganizationId();
        } catch (Exception e) {
            // fallback
        }
        return getRecentAuditLogs(orgId, pageable);
    }

    public Page<AuditLogResponse> getRecentAuditLogs(Long organizationId, Pageable pageable) {
        if (organizationId == null) {
            return auditLogRepository.findAll(pageable)
                .map(log -> new AuditLogResponse(
                    log.getId(),
                    log.getIssue().getId(),
                    log.getAction(),
                    log.getActor(),
                    log.getCreatedAt()
                ));
        }
        return auditLogRepository.findByIssueOrganizationId(organizationId, pageable)
            .map(log -> new AuditLogResponse(
                log.getId(),
                log.getIssue().getId(),
                log.getAction(),
                log.getActor(),
                log.getCreatedAt()
            ));
    }
}
