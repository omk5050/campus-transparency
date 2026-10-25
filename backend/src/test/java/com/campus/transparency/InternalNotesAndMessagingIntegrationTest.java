package com.campus.transparency;

import com.campus.transparency.api.message.CreateIssueMessageRequest;
import com.campus.transparency.api.message.UpdateIssueMessageRequest;
import com.campus.transparency.api.note.CreateInternalNoteRequest;
import com.campus.transparency.api.note.UpdateInternalNoteRequest;
import com.campus.transparency.domain.audit.AuditLog;
import com.campus.transparency.domain.audit.AuditLogRepository;
import com.campus.transparency.domain.issue.Issue;
import com.campus.transparency.domain.issue.IssueRepository;
import com.campus.transparency.domain.message.IssueMessage;
import com.campus.transparency.domain.message.IssueMessageRepository;
import com.campus.transparency.domain.note.InternalNote;
import com.campus.transparency.domain.note.InternalNoteRepository;
import com.campus.transparency.domain.organization.Organization;
import com.campus.transparency.domain.organization.OrganizationRepository;
import com.campus.transparency.domain.organization.OrganizationStatus;
import com.campus.transparency.domain.organization.OrganizationType;
import com.campus.transparency.domain.user.Role;
import com.campus.transparency.domain.user.User;
import com.campus.transparency.domain.user.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

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
public class InternalNotesAndMessagingIntegrationTest {

    static {
        com.campus.transparency.config.DotenvLoader.load();
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private IssueRepository issueRepository;

    @Autowired
    private InternalNoteRepository internalNoteRepository;

    @Autowired
    private IssueMessageRepository issueMessageRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final String testSuffix = "_" + System.currentTimeMillis();

    private Organization orgAlpha;
    private Organization orgBeta;

    private User adminAlpha;
    private User investigatorAlpha;
    private User studentAlpha;

    private User adminBeta;
    private User investigatorBeta;
    private User studentBeta;

    private Issue issueAlpha;
    private Issue issueBeta;

    private Long createdNoteId;
    private Long createdMessageId;

    @BeforeAll
    void setupTestData() {
        orgAlpha = organizationRepository.save(new Organization(
                "Notes Test Org Alpha" + testSuffix,
                OrganizationType.UNIVERSITY,
                OrganizationStatus.ACTIVE,
                "contact_alpha" + testSuffix + "@test.edu"
        ));

        orgBeta = organizationRepository.save(new Organization(
                "Notes Test Org Beta" + testSuffix,
                OrganizationType.COLLEGE,
                OrganizationStatus.ACTIVE,
                "contact_beta" + testSuffix + "@test.edu"
        ));

        String encodedPass = passwordEncoder.encode("Pass123!Safe");

        adminAlpha = userRepository.save(new User("adm_a" + testSuffix, encodedPass, Role.ADMIN, orgAlpha));
        investigatorAlpha = userRepository.save(new User("inv_a" + testSuffix, encodedPass, Role.ADMIN, orgAlpha));
        studentAlpha = userRepository.save(new User("stu_a" + testSuffix, encodedPass, Role.STUDENT, orgAlpha));

        adminBeta = userRepository.save(new User("adm_b" + testSuffix, encodedPass, Role.ADMIN, orgBeta));
        investigatorBeta = userRepository.save(new User("inv_b" + testSuffix, encodedPass, Role.ADMIN, orgBeta));
        studentBeta = userRepository.save(new User("stu_b" + testSuffix, encodedPass, Role.STUDENT, orgBeta));

        issueAlpha = new Issue(
                "Alpha Heating Failure",
                "Severe heating failure in dorms",
                "hash_alpha" + testSuffix,
                "Infrastructure",
                "Facilities",
                orgAlpha
        );
        issueAlpha.setReporter(studentAlpha);
        issueAlpha.assignTo(investigatorAlpha);
        issueAlpha = issueRepository.save(issueAlpha);

        issueBeta = new Issue(
                "Beta Water Contamination",
                "Chemistry lab plumbing leak",
                "hash_beta" + testSuffix,
                "Safety",
                "Operations",
                orgBeta
        );
        issueBeta.setReporter(studentBeta);
        issueBeta.assignTo(investigatorBeta);
        issueBeta = issueRepository.save(issueBeta);
    }

    // =========================================================================
    // 1. INTERNAL NOTES TESTS (1-13)
    // =========================================================================

    @Test
    @Order(1)
    void adminCanCreateInternalNote() throws Exception {
        CreateInternalNoteRequest request = new CreateInternalNoteRequest("Initial inspection completed. Pipe replacement needed.");

        MvcResult result = mockMvc.perform(post("/api/issues/" + issueAlpha.getId() + "/internal-notes")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminAlpha.getUsername()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.issueId").value(issueAlpha.getId()))
                .andExpect(jsonPath("$.authorUsername").value(adminAlpha.getUsername()))
                .andExpect(jsonPath("$.content").value("Initial inspection completed. Pipe replacement needed."))
                .andExpect(jsonPath("$.createdAt").exists())
                .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        createdNoteId = json.get("id").asLong();

        // Check note exists in DB
        InternalNote savedNote = internalNoteRepository.findById(createdNoteId).orElseThrow();
        assertThat(savedNote.getOrganization().getId()).isEqualTo(orgAlpha.getId());
        assertThat(savedNote.getAuthor().getId()).isEqualTo(adminAlpha.getId());
    }

    @Test
    @Order(2)
    void adminCanReadInternalNotes() throws Exception {
        mockMvc.perform(get("/api/issues/" + issueAlpha.getId() + "/internal-notes")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminAlpha.getUsername()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(createdNoteId))
                .andExpect(jsonPath("$[0].content").value("Initial inspection completed. Pipe replacement needed."));
    }

    @Test
    @Order(3)
    void authorCanUpdatePermittedNote() throws Exception {
        UpdateInternalNoteRequest request = new UpdateInternalNoteRequest("Updated: Contractor scheduled for tomorrow morning.");

        mockMvc.perform(put("/api/issues/" + issueAlpha.getId() + "/internal-notes/" + createdNoteId)
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminAlpha.getUsername()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(createdNoteId))
                .andExpect(jsonPath("$.content").value("Updated: Contractor scheduled for tomorrow morning."));

        InternalNote updatedNote = internalNoteRepository.findById(createdNoteId).orElseThrow();
        assertThat(updatedNote.getContent()).isEqualTo("Updated: Contractor scheduled for tomorrow morning.");
    }

    @Test
    @Order(4)
    void studentCannotCreateInternalNote() throws Exception {
        CreateInternalNoteRequest request = new CreateInternalNoteRequest("Student attempting unauthorized note creation");

        mockMvc.perform(post("/api/issues/" + issueAlpha.getId() + "/internal-notes")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(studentAlpha.getUsername()).roles("STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(5)
    void studentCannotReadInternalNotes() throws Exception {
        mockMvc.perform(get("/api/issues/" + issueAlpha.getId() + "/internal-notes")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(studentAlpha.getUsername()).roles("STUDENT")))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(6)
    void unauthenticatedUserCannotAccessInternalNotes() throws Exception {
        mockMvc.perform(get("/api/issues/" + issueAlpha.getId() + "/internal-notes"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/issues/" + issueAlpha.getId() + "/internal-notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"anonymous note\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(7)
    void orgBAdminCannotAccessOrgANotes() throws Exception {
        // Cross-tenant attempt returns 404 NOT_FOUND
        mockMvc.perform(get("/api/issues/" + issueAlpha.getId() + "/internal-notes")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminBeta.getUsername()).roles("ADMIN")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        mockMvc.perform(post("/api/issues/" + issueAlpha.getId() + "/internal-notes")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminBeta.getUsername()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateInternalNoteRequest("Malicious cross-org note"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    @Order(8)
    void clientCannotChooseAnotherOrganizationOrImpersonateAuthor() throws Exception {
        // Even if body contains malicious extra fields, server strictly uses authenticated user & issue org
        String maliciousPayload = "{\"content\":\"Valid Note Body\",\"organizationId\":99999,\"authorId\":99999}";

        MvcResult result = mockMvc.perform(post("/api/issues/" + issueAlpha.getId() + "/internal-notes")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(investigatorAlpha.getUsername()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(maliciousPayload))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        Long noteId = json.get("id").asLong();

        InternalNote savedNote = internalNoteRepository.findById(noteId).orElseThrow();
        assertThat(savedNote.getOrganization().getId()).isEqualTo(orgAlpha.getId());
        assertThat(savedNote.getAuthor().getId()).isEqualTo(investigatorAlpha.getId());
    }

    @Test
    @Order(9)
    void blankInternalNoteIsRejected() throws Exception {
        CreateInternalNoteRequest emptyRequest = new CreateInternalNoteRequest("   ");

        mockMvc.perform(post("/api/issues/" + issueAlpha.getId() + "/internal-notes")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminAlpha.getUsername()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(emptyRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(10)
    void oversizedInternalNoteIsRejected() throws Exception {
        String longContent = "A".repeat(5001);
        CreateInternalNoteRequest oversizedRequest = new CreateInternalNoteRequest(longContent);

        mockMvc.perform(post("/api/issues/" + issueAlpha.getId() + "/internal-notes")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminAlpha.getUsername()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(oversizedRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(11)
    void noteAuditActionIsRecorded() throws Exception {
        List<AuditLog> logs = auditLogRepository.findAll().stream()
                .filter(l -> l.getIssue().getId().equals(issueAlpha.getId()))
                .filter(l -> l.getAction().startsWith("INTERNAL_NOTE_"))
                .toList();

        assertThat(logs).isNotEmpty();
        assertThat(logs.stream().anyMatch(l -> l.getAction().equals("INTERNAL_NOTE_CREATED"))).isTrue();
        assertThat(logs.stream().anyMatch(l -> l.getAction().equals("INTERNAL_NOTE_UPDATED"))).isTrue();
    }

    @Test
    @Order(12)
    void authorizedUserCanDeletePermittedNote() throws Exception {
        mockMvc.perform(delete("/api/issues/" + issueAlpha.getId() + "/internal-notes/" + createdNoteId)
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminAlpha.getUsername()).roles("ADMIN")))
                .andExpect(status().isNoContent());

        assertThat(internalNoteRepository.findById(createdNoteId)).isEmpty();

        List<AuditLog> logs = auditLogRepository.findAll().stream()
                .filter(l -> l.getIssue().getId().equals(issueAlpha.getId()))
                .filter(l -> l.getAction().equals("INTERNAL_NOTE_DELETED"))
                .toList();
        assertThat(logs).isNotEmpty();
    }

    // =========================================================================
    // 2. INVESTIGATOR / ADMIN MESSAGING TESTS (14-26)
    // =========================================================================

    @Test
    @Order(13)
    void adminCanCreateIssueMessage() throws Exception {
        CreateIssueMessageRequest request = new CreateIssueMessageRequest("Hello team, please review the safety reports.");

        MvcResult result = mockMvc.perform(post("/api/issues/" + issueAlpha.getId() + "/messages")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminAlpha.getUsername()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.issueId").value(issueAlpha.getId()))
                .andExpect(jsonPath("$.senderUsername").value(adminAlpha.getUsername()))
                .andExpect(jsonPath("$.content").value("Hello team, please review the safety reports."))
                .andExpect(jsonPath("$.createdAt").exists())
                .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        createdMessageId = json.get("id").asLong();

        IssueMessage savedMessage = issueMessageRepository.findById(createdMessageId).orElseThrow();
        assertThat(savedMessage.getOrganization().getId()).isEqualTo(orgAlpha.getId());
        assertThat(savedMessage.getSender().getId()).isEqualTo(adminAlpha.getId());
    }

    @Test
    @Order(14)
    void adminCanReadIssueMessages() throws Exception {
        mockMvc.perform(get("/api/issues/" + issueAlpha.getId() + "/messages")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminAlpha.getUsername()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(createdMessageId))
                .andExpect(jsonPath("$[0].content").value("Hello team, please review the safety reports."));
    }

    @Test
    @Order(15)
    void senderCanUpdatePermittedMessage() throws Exception {
        UpdateIssueMessageRequest request = new UpdateIssueMessageRequest("Updated: Inspection scheduled for 2 PM.");

        mockMvc.perform(put("/api/issues/" + issueAlpha.getId() + "/messages/" + createdMessageId)
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminAlpha.getUsername()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(createdMessageId))
                .andExpect(jsonPath("$.content").value("Updated: Inspection scheduled for 2 PM."));

        IssueMessage updatedMessage = issueMessageRepository.findById(createdMessageId).orElseThrow();
        assertThat(updatedMessage.getContent()).isEqualTo("Updated: Inspection scheduled for 2 PM.");
    }

    @Test
    @Order(16)
    void nonSenderCannotUpdateMessage() throws Exception {
        // InvestigatorAlpha tries to edit AdminAlpha's message -> 403 Forbidden
        UpdateIssueMessageRequest request = new UpdateIssueMessageRequest("Malicious override attempt");

        mockMvc.perform(put("/api/issues/" + issueAlpha.getId() + "/messages/" + createdMessageId)
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(investigatorAlpha.getUsername()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(17)
    void studentCannotCreateOrReadIssueMessages() throws Exception {
        CreateIssueMessageRequest request = new CreateIssueMessageRequest("Student attempting message");

        mockMvc.perform(post("/api/issues/" + issueAlpha.getId() + "/messages")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(studentAlpha.getUsername()).roles("STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/issues/" + issueAlpha.getId() + "/messages")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(studentAlpha.getUsername()).roles("STUDENT")))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(18)
    void unauthenticatedUserCannotAccessMessages() throws Exception {
        mockMvc.perform(get("/api/issues/" + issueAlpha.getId() + "/messages"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/issues/" + issueAlpha.getId() + "/messages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"anonymous message\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(19)
    void orgBAdminCannotAccessOrgAMessages() throws Exception {
        mockMvc.perform(get("/api/issues/" + issueAlpha.getId() + "/messages")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminBeta.getUsername()).roles("ADMIN")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        mockMvc.perform(post("/api/issues/" + issueAlpha.getId() + "/messages")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminBeta.getUsername()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateIssueMessageRequest("Cross-tenant spy message"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    @Order(20)
    void blankOrOversizedMessageRejected() throws Exception {
        mockMvc.perform(post("/api/issues/" + issueAlpha.getId() + "/messages")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminAlpha.getUsername()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateIssueMessageRequest("   "))))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/issues/" + issueAlpha.getId() + "/messages")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminAlpha.getUsername()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateIssueMessageRequest("M".repeat(5001)))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(21)
    void messageAuditActionIsRecorded() throws Exception {
        List<AuditLog> logs = auditLogRepository.findAll().stream()
                .filter(l -> l.getIssue().getId().equals(issueAlpha.getId()))
                .filter(l -> l.getAction().startsWith("ISSUE_MESSAGE_"))
                .toList();

        assertThat(logs).isNotEmpty();
        assertThat(logs.stream().anyMatch(l -> l.getAction().equals("ISSUE_MESSAGE_SENT"))).isTrue();
        assertThat(logs.stream().anyMatch(l -> l.getAction().equals("ISSUE_MESSAGE_UPDATED"))).isTrue();
    }

    @Test
    @Order(22)
    void authorizedUserCanDeletePermittedMessage() throws Exception {
        mockMvc.perform(delete("/api/issues/" + issueAlpha.getId() + "/messages/" + createdMessageId)
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminAlpha.getUsername()).roles("ADMIN")))
                .andExpect(status().isNoContent());

        assertThat(issueMessageRepository.findById(createdMessageId)).isEmpty();

        List<AuditLog> logs = auditLogRepository.findAll().stream()
                .filter(l -> l.getIssue().getId().equals(issueAlpha.getId()))
                .filter(l -> l.getAction().equals("ISSUE_MESSAGE_DELETED"))
                .toList();
        assertThat(logs).isNotEmpty();
    }

    // =========================================================================
    // 3. ASSIGNMENT & TENANT CROSS-ID PROTECTION (27-32)
    // =========================================================================

    @Test
    @Order(23)
    void assignedInvestigatorCanAccessNotesAndMessages() throws Exception {
        // InvestigatorAlpha is assigned to IssueAlpha
        mockMvc.perform(post("/api/issues/" + issueAlpha.getId() + "/internal-notes")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(investigatorAlpha.getUsername()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateInternalNoteRequest("Assigned investigator note"))))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/issues/" + issueAlpha.getId() + "/messages")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(investigatorAlpha.getUsername()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateIssueMessageRequest("Assigned investigator message"))))
                .andExpect(status().isCreated());
    }

    @Test
    @Order(24)
    void crossTenantNoteAndMessageIdsCannotBeManipulated() throws Exception {
        // Create note and message in Org Beta
        InternalNote betaNote = internalNoteRepository.save(new InternalNote(issueBeta, adminBeta, orgBeta, "Beta Private Note"));
        IssueMessage betaMessage = issueMessageRepository.save(new IssueMessage(issueBeta, adminBeta, orgBeta, "Beta Private Message"));

        // Admin Alpha tries to access/update/delete Beta Note using Org Alpha context or Beta issue ID
        mockMvc.perform(put("/api/issues/" + issueBeta.getId() + "/internal-notes/" + betaNote.getId())
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminAlpha.getUsername()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateInternalNoteRequest("Hacked content"))))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/issues/" + issueBeta.getId() + "/internal-notes/" + betaNote.getId())
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminAlpha.getUsername()).roles("ADMIN")))
                .andExpect(status().isNotFound());

        // Admin Alpha tries to access/update/delete Beta Message using Org Alpha context or Beta issue ID
        mockMvc.perform(put("/api/issues/" + issueBeta.getId() + "/messages/" + betaMessage.getId())
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminAlpha.getUsername()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateIssueMessageRequest("Hacked message"))))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/issues/" + issueBeta.getId() + "/messages/" + betaMessage.getId())
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminAlpha.getUsername()).roles("ADMIN")))
                .andExpect(status().isNotFound());
    }

    // =========================================================================
    // 4. PUBLIC DATA LEAKAGE SAFETY (33-37)
    // =========================================================================

    @Test
    @Order(25)
    void publicIssueDetailContainsNoInternalNotesOrMessages() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/issues/" + issueAlpha.getId())
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(studentAlpha.getUsername()).roles("STUDENT")))
                .andExpect(status().isOk())
                .andReturn();

        String body = result.getResponse().getContentAsString();
        assertThat(body).doesNotContain("Assigned investigator note");
        assertThat(body).doesNotContain("Assigned investigator message");
        assertThat(body).doesNotContain("internalNotes");
        assertThat(body).doesNotContain("messages");
    }

    @Test
    @Order(26)
    void publicTrackingContainsNoInternalNotesOrMessages() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/issues/track/" + issueAlpha.getTrackingCode()))
                .andExpect(status().isOk())
                .andReturn();

        String body = result.getResponse().getContentAsString();
        assertThat(body).doesNotContain("Assigned investigator note");
        assertThat(body).doesNotContain("Assigned investigator message");
        assertThat(body).doesNotContain("internalNotes");
        assertThat(body).doesNotContain("messages");
    }

    @Test
    @Order(27)
    void publicFeedContainsNoInternalNotesOrMessages() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/issues")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(studentAlpha.getUsername()).roles("STUDENT")))
                .andExpect(status().isOk())
                .andReturn();

        String body = result.getResponse().getContentAsString();
        assertThat(body).doesNotContain("Assigned investigator note");
        assertThat(body).doesNotContain("Assigned investigator message");
        assertThat(body).doesNotContain("internalNotes");
        assertThat(body).doesNotContain("messages");
    }
}
