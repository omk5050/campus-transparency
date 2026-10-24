package com.campus.transparency.api.notification;

import com.campus.transparency.application.notification.NotificationService;
import com.campus.transparency.domain.user.User;
import com.campus.transparency.security.CurrentUserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@PreAuthorize("isAuthenticated()")
public class NotificationController {

    private final NotificationService notificationService;
    private final CurrentUserService currentUserService;

    public NotificationController(
            NotificationService notificationService,
            CurrentUserService currentUserService
    ) {
        this.notificationService = notificationService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public Page<NotificationResponse> getNotifications(
            @RequestParam(required = false) Boolean unreadOnly,
            Pageable pageable
    ) {
        User currentUser = currentUserService.getCurrentUser();
        return notificationService.getMyNotifications(currentUser, unreadOnly, pageable);
    }

    @GetMapping("/unread-count")
    public UnreadCountResponse getUnreadCount() {
        User currentUser = currentUserService.getCurrentUser();
        return notificationService.getUnreadCount(currentUser);
    }

    @PostMapping("/{id}/read")
    public NotificationResponse markAsRead(@PathVariable Long id) {
        User currentUser = currentUserService.getCurrentUser();
        return notificationService.markAsRead(id, currentUser);
    }

    @PostMapping("/read-all")
    public void markAllAsRead() {
        User currentUser = currentUserService.getCurrentUser();
        notificationService.markAllAsRead(currentUser);
    }
}
