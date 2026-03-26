package com.campus.transparency.application.audit;

import com.campus.transparency.domain.audit.AuditLog;
import com.campus.transparency.domain.audit.AuditLogRepository;
import org.springframework.stereotype.Service;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void log(String action, String actor, Long issueId) {
        AuditLog auditLog = new AuditLog(action, actor, issueId);
        auditLogRepository.save(auditLog);
    }
}   