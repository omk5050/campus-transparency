package com.campus.transparency.api.notification;

import com.campus.transparency.domain.notification.Notification;
import com.campus.transparency.domain.notification.NotificationType;

import java.time.Instant;

public record NotificationResponse(
        Long id,
        Long recipientId,
        Long organizationId,
        NotificationType type,
        String title,
        String message,
        String entityType,
        Long entityId,
        boolean isRead,
        Instant createdAt,
        Instant readAt
) {
    public static NotificationResponse from(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getRecipient().getId(),
                n.getOrganization() != null ? n.getOrganization().getId() : null,
                n.getType(),
                n.getTitle(),
                n.getMessage(),
                n.getEntityType(),
                n.getEntityId(),
                n.isRead(),
                n.getCreatedAt(),
                n.getReadAt()
        );
    }
}
