package com.campus.transparency.application.audit;

import com.campus.transparency.domain.audit.AuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AuditQueryService {

    private final AuditLogRepository auditLogRepository;

    public AuditQueryService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public Page<AuditLogResponse> getRecentAuditLogs(Pageable pageable) {
        return auditLogRepository.findAll(pageable)
            .map(log -> new AuditLogResponse(
                log.getId(),
                log.getIssue().getId(),
                log.getAction(),
                log.getActor(),
                log.getCreatedAt()
            ));
    }
}
