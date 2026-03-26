package com.campus.transparency.application.audit;

import com.campus.transparency.domain.audit.AuditLog;
import com.campus.transparency.domain.audit.AuditLogRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void log(String action, Long issueId) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        String actor;

        if (auth != null && auth.isAuthenticated() && auth.getName() != null) {
            actor = auth.getName();   // ✅ real logged-in user
        } else {
            actor = "SYSTEM";        // fallback (should rarely happen)
        }

        AuditLog auditLog = new AuditLog(action, actor, issueId);

        auditLogRepository.save(auditLog);
    }
}