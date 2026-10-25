package com.campus.transparency;

import com.campus.transparency.api.issue.AssignIssueRequest;
import com.campus.transparency.api.message.CreateIssueMessageRequest;
import com.campus.transparency.domain.issue.Issue;
import com.campus.transparency.domain.issue.IssueRepository;
import com.campus.transparency.domain.issue.IssueStatus;
import com.campus.transparency.domain.notification.Notification;
import com.campus.transparency.domain.notification.NotificationRepository;
import com.campus.transparency.domain.notification.NotificationType;
import com.campus.transparency.domain.organization.Organization;
import com.campus.transparency.domain.organization.OrganizationRepository;
import com.campus.transparency.domain.organization.OrganizationStatus;
import com.campus.transparency.domain.organization.OrganizationType;
import com.campus.transparency.domain.user.Role;
import com.campus.transparency.domain.user.User;
import com.campus.transparency.domain.user.UserRepository;
import com.campus.transparency.application.notification.NotificationService;
import com.campus.transparency.application.issue.IssueCommandService;
import com.campus.transparency.application.message.IssueMessageService;
import com.campus.transparency.application.organization.OrganizationApplicationService;
import com.campus.transparency.api.organization.CreateOrganizationApplicationRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.campus.transparency.testconfig.IsolatedTestDatabase;

@SpringBootTest
@AutoConfigureMockMvc
@IsolatedTestDatabase
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class NotificationIntegrationTest {

    static {
        com.campus.transparency.config.DotenvLoader.load();
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private IssueCommandService issueCommandService;

    @Autowired
    private IssueMessageService issueMessageService;

    @Autowired
    private OrganizationApplicationService applicationService;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private IssueRepository issueRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Organization testOrgA;
    private Organization testOrgB;
    private User adminA;
    private User investigatorA;
    private User studentA;
    private User adminB;
    private Issue testIssueA;

    private final String suffix = "_" + System.currentTimeMillis();

    @BeforeAll
    void setupData() {
        testOrgA = organizationRepository.save(new Organization(
                "Notif Org A" + suffix,
                OrganizationType.UNIVERSITY,
                OrganizationStatus.ACTIVE,
                "orgA" + suffix + "@test.edu"
        ));

        testOrgB = organizationRepository.save(new Organization(
                "Notif Org B" + suffix,
                OrganizationType.COLLEGE,
                OrganizationStatus.ACTIVE,
                "orgB" + suffix + "@test.edu"
        ));

        adminA = userRepository.save(new User(
                "notif_adminA" + suffix,
                passwordEncoder.encode("Pass123!"),
                Role.ADMIN,
                testOrgA
        ));

        investigatorA = userRepository.save(new User(
                "notif_invA" + suffix,
                passwordEncoder.encode("Pass123!"),
                Role.ADMIN,
                testOrgA
        ));

        studentA = userRepository.save(new User(
                "notif_stuA" + suffix,
                passwordEncoder.encode("Pass123!"),
                Role.STUDENT,
                testOrgA
        ));

        adminB = userRepository.save(new User(
                "notif_adminB" + suffix,
                passwordEncoder.encode("Pass123!"),
                Role.ADMIN,
                testOrgB
        ));

        testIssueA = issueRepository.save(new Issue(
                "Broken HVAC Unit " + suffix,
                "Air conditioning unit in lecture hall is leaking water",
                "reporter_hash_" + suffix,
                "Facilities",
                "Facilities & Operations",
                testOrgA
        ));
    }

    @Test
    @Order(1)
    void unauthenticatedUserDenied() throws Exception {
        mockMvc.perform(get("/api/notifications"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/notifications/unread-count"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/notifications/1/read"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/notifications/read-all"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(2)
    void authenticatedUserCanRetrieveOwnNotificationsAndUnreadCount() throws Exception {
        // Create 2 notifications for investigatorA
        Notification n1 = notificationService.createNotification(
                investigatorA,
                testOrgA,
                NotificationType.ISSUE_ASSIGNED,
                "Case Assigned",
                "You have been assigned to case #" + testIssueA.getId() + ".",
                "ISSUE",
                testIssueA.getId()
        );

        Notification n2 = notificationService.createNotification(
                investigatorA,
                testOrgA,
                NotificationType.INTERNAL_MESSAGE_RECEIVED,
                "New Case Message",
                "A new internal message was sent on case #" + testIssueA.getId() + ".",
                "ISSUE",
                testIssueA.getId()
        );

        // Retrieve notifications for investigatorA
        mockMvc.perform(get("/api/notifications")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(investigatorA.getUsername()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.content[0].recipientId").value(investigatorA.getId()))
                .andExpect(jsonPath("$.content[0].isRead").value(false))
                .andExpect(jsonPath("$.content[0].type").value("INTERNAL_MESSAGE_RECEIVED"));

        // Unread count
        mockMvc.perform(get("/api/notifications/unread-count")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(investigatorA.getUsername()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(2));
    }

    @Test
    @Order(3)
    void userCannotAccessAnotherUsersNotification() throws Exception {
        // Find notification belonging to investigatorA
        List<Notification> invNotifs = notificationRepository.findAll().stream()
                .filter(n -> n.getRecipient().getId().equals(investigatorA.getId()))
                .toList();
        assertThat(invNotifs).isNotEmpty();
        Long notifId = invNotifs.get(0).getId();

        // adminB (or studentA) attempts to mark investigatorA's notification read -> 404 (not found for current user)
        mockMvc.perform(post("/api/notifications/" + notifId + "/read")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminB.getUsername()).roles("ADMIN")))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(4)
    void organizationIsolationEnforcedInNotificationQueries() throws Exception {
        // adminB queries notifications -> receives 0 (isolated from investigatorA & testOrgA)
        mockMvc.perform(get("/api/notifications")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminB.getUsername()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(0));

        mockMvc.perform(get("/api/notifications/unread-count")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminB.getUsername()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(0));
    }

    @Test
    @Order(5)
    void markReadWorks() throws Exception {
        List<Notification> invNotifs = notificationRepository.findAll().stream()
                .filter(n -> n.getRecipient().getId().equals(investigatorA.getId()) && !n.isRead())
                .toList();
        assertThat(invNotifs).isNotEmpty();
        Long targetId = invNotifs.get(0).getId();

        mockMvc.perform(post("/api/notifications/" + targetId + "/read")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(investigatorA.getUsername()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(targetId))
                .andExpect(jsonPath("$.isRead").value(true))
                .andExpect(jsonPath("$.readAt").isNotEmpty());

        // Unread count should now be 1
        mockMvc.perform(get("/api/notifications/unread-count")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(investigatorA.getUsername()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(1));
    }

    @Test
    @Order(6)
    void markAllAsReadWorks() throws Exception {
        mockMvc.perform(post("/api/notifications/read-all")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(investigatorA.getUsername()).roles("ADMIN")))
                .andExpect(status().isOk());

        // Unread count should now be 0
        mockMvc.perform(get("/api/notifications/unread-count")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(investigatorA.getUsername()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(0));

        // Unread only query returns empty
        mockMvc.perform(get("/api/notifications?unreadOnly=true")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(investigatorA.getUsername()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(0));
    }

    @Test
    @Order(7)
    void notificationCreatedAfterSuccessfulIssueAssignment() throws Exception {
        long countBefore = notificationRepository.countByRecipientIdAndIsReadFalse(investigatorA.getId());

        // Assign issue to investigatorA via IssueCommandService
        issueCommandService.assign(testIssueA.getId(), investigatorA.getId(), "Facilities", adminA.getUsername());

        long countAfter = notificationRepository.countByRecipientIdAndIsReadFalse(investigatorA.getId());
        assertThat(countAfter).isEqualTo(countBefore + 1);

        Notification latest = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(investigatorA.getId(), org.springframework.data.domain.PageRequest.of(0, 1))
                .getContent().get(0);
        assertThat(latest.getType()).isEqualTo(NotificationType.ISSUE_ASSIGNED);
        assertThat(latest.getTitle()).isEqualTo("Case Assigned");
        assertThat(latest.getEntityId()).isEqualTo(testIssueA.getId());
    }

    @Test
    @Order(8)
    void notificationNotCreatedAfterFailedAssignment() {
        long countBefore = notificationRepository.countByRecipientIdAndIsReadFalse(investigatorA.getId());

        // Attempt invalid cross-org assignment (assigning adminB from testOrgB to testIssueA from testOrgA)
        org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class, () -> {
            issueCommandService.assign(testIssueA.getId(), adminB.getId(), "Facilities", adminA.getUsername());
        });

        long countAfter = notificationRepository.countByRecipientIdAndIsReadFalse(investigatorA.getId());
        assertThat(countAfter).isEqualTo(countBefore);
    }

    @Test
    @Order(9)
    void notificationCreatedAfterRelevantStatusTransition() throws Exception {
        long countBefore = notificationRepository.countByRecipientIdAndIsReadFalse(investigatorA.getId());

        // Start progress on testIssueA
        issueCommandService.startProgress(testIssueA.getId());

        long countAfter = notificationRepository.countByRecipientIdAndIsReadFalse(investigatorA.getId());
        assertThat(countAfter).isEqualTo(countBefore + 1);

        Notification latest = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(investigatorA.getId(), org.springframework.data.domain.PageRequest.of(0, 1))
                .getContent().get(0);
        assertThat(latest.getType()).isEqualTo(NotificationType.ISSUE_STATUS_CHANGED);
        assertThat(latest.getMessage()).contains("IN_PROGRESS");
    }

    @Test
    @Order(10)
    void internalMessageNotificationRespectsAuthorization() throws Exception {
        long countBefore = notificationRepository.countByRecipientIdAndIsReadFalse(investigatorA.getId());

        // adminA sends an internal message on testIssueA (which is assigned to investigatorA)
        issueMessageService.createMessage(testIssueA.getId(), new CreateIssueMessageRequest("Please check the roof pipe"), adminA);

        long countAfter = notificationRepository.countByRecipientIdAndIsReadFalse(investigatorA.getId());
        assertThat(countAfter).isEqualTo(countBefore + 1);

        Notification latest = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(investigatorA.getId(), org.springframework.data.domain.PageRequest.of(0, 1))
                .getContent().get(0);
        assertThat(latest.getType()).isEqualTo(NotificationType.INTERNAL_MESSAGE_RECEIVED);
        // Ensure message content itself is NOT exposed in the notification message
        assertThat(latest.getMessage()).doesNotContain("Please check the roof pipe");
        assertThat(latest.getMessage()).contains("case #" + testIssueA.getId());
    }

    @Test
    @Order(11)
    void organizationApplicationNotificationRespectsOwnership() throws Exception {
        String appOrgName = "Future Tech " + suffix;
        String appAdmin = "future_admin_" + suffix;
        var appRes = applicationService.submitApplication(new CreateOrganizationApplicationRequest(
                appOrgName,
                OrganizationType.UNIVERSITY,
                "future_" + suffix + "@edu.org",
                "Director Smith",
                "100 Future Way",
                "https://future.org",
                "Description",
                "future_" + suffix + "@edu.org",
                appAdmin,
                "Pass1234!"
        ));

        // Approve application as superadmin
        var approved = applicationService.approveApplication(appRes.id(), "superadmin");
        assertThat(approved.status().name()).isEqualTo("APPROVED");

        // Verify the newly created admin user received the notification
        User newAdmin = userRepository.findByUsername(appAdmin).orElseThrow();
        List<Notification> notifs = notificationRepository.findAll().stream()
                .filter(n -> n.getRecipient().getId().equals(newAdmin.getId()))
                .toList();
        assertThat(notifs).isNotEmpty();
        assertThat(notifs.get(0).getType()).isEqualTo(NotificationType.ORGANIZATION_APPLICATION_APPROVED);
        assertThat(notifs.get(0).getTitle()).isEqualTo("Organization Approved");
    }

    @Test
    @Order(12)
    void duplicateNotificationsNotUnintentionallyCreated() throws Exception {
        // Marking read on an already read notification does not duplicate or alter read count
        List<Notification> invNotifs = notificationRepository.findAll().stream()
                .filter(n -> n.getRecipient().getId().equals(investigatorA.getId()))
                .toList();
        Notification target = invNotifs.get(0);
        target.markAsRead();
        notificationRepository.save(target);

        long unreadBefore = notificationRepository.countByRecipientIdAndIsReadFalse(investigatorA.getId());

        mockMvc.perform(post("/api/notifications/" + target.getId() + "/read")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(investigatorA.getUsername()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isRead").value(true));

        long unreadAfter = notificationRepository.countByRecipientIdAndIsReadFalse(investigatorA.getId());
        assertThat(unreadAfter).isEqualTo(unreadBefore);
    }

    @Test
    @Order(13)
    void notificationDtoDoesNotLeakSensitiveFields() throws Exception {
        mockMvc.perform(get("/api/notifications")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(investigatorA.getUsername()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].password").doesNotExist())
                .andExpect(jsonPath("$.content[0].token").doesNotExist())
                .andExpect(jsonPath("$.content[0].reporterHash").doesNotExist())
                .andExpect(jsonPath("$.content[0].internalNotes").doesNotExist());
    }
}
