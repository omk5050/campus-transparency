package com.campus.transparency.api.audit;

import com.campus.transparency.application.audit.AuditLogResponse;
import com.campus.transparency.application.audit.AuditQueryService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/audit")
public class AuditController {

    private final AuditQueryService auditQueryService;

    public AuditController(AuditQueryService auditQueryService) {
        this.auditQueryService = auditQueryService;
    }

    @GetMapping
    public Page<AuditLogResponse> getAuditLogs(Pageable pageable) {
        return auditQueryService.getRecentAuditLogs(pageable);
    }
}
