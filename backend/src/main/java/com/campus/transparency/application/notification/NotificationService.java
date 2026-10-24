package com.campus.transparency.application.notification;

import com.campus.transparency.api.notification.NotificationResponse;
import com.campus.transparency.api.notification.UnreadCountResponse;
import com.campus.transparency.domain.notification.Notification;
import com.campus.transparency.domain.notification.NotificationRepository;
import com.campus.transparency.domain.notification.NotificationType;
import com.campus.transparency.domain.organization.Organization;
import com.campus.transparency.domain.user.User;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public Notification createNotification(
            User recipient,
            Organization organization,
            NotificationType type,
            String title,
            String message,
            String entityType,
            Long entityId
    ) {
        if (recipient == null) {
            return null;
        }
        Notification notification = new Notification(
                recipient,
                organization,
                type,
                title,
                message,
                entityType,
                entityId
        );
        return notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public Page<NotificationResponse> getMyNotifications(User currentUser, Boolean unreadOnly, Pageable pageable) {
        Page<Notification> page;
        if (Boolean.TRUE.equals(unreadOnly)) {
            page = notificationRepository.findByRecipientIdAndIsReadFalseOrderByCreatedAtDesc(currentUser.getId(), pageable);
        } else {
            page = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(currentUser.getId(), pageable);
        }
        return page.map(NotificationResponse::from);
    }

    @Transactional(readOnly = true)
    public UnreadCountResponse getUnreadCount(User currentUser) {
        long count = notificationRepository.countByRecipientIdAndIsReadFalse(currentUser.getId());
        return new UnreadCountResponse(count);
    }

    @Transactional
    public NotificationResponse markAsRead(Long id, User currentUser) {
        Notification notification = notificationRepository.findByIdAndRecipientId(id, currentUser.getId())
                .orElseThrow(() -> new EntityNotFoundException("Notification not found: " + id));
        if (!notification.isRead()) {
            notification.markAsRead();
            notification = notificationRepository.save(notification);
        }
        return NotificationResponse.from(notification);
    }

    @Transactional
    public void markAllAsRead(User currentUser) {
        notificationRepository.markAllAsRead(currentUser.getId(), Instant.now());
    }
}
