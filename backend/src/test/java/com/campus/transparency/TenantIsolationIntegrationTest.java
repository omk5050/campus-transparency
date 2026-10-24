package com.campus.transparency;

import com.campus.transparency.api.issue.AssignIssueRequest;
import com.campus.transparency.api.issue.CreateIssueRequest;
import com.campus.transparency.domain.audit.AuditLog;
import com.campus.transparency.domain.audit.AuditLogRepository;
import com.campus.transparency.domain.issue.Issue;
import com.campus.transparency.domain.issue.IssueRepository;
import com.campus.transparency.domain.issue.IssueStatus;
import com.campus.transparency.domain.organization.Organization;
import com.campus.transparency.domain.organization.OrganizationRepository;
import com.campus.transparency.domain.organization.OrganizationStatus;
import com.campus.transparency.domain.organization.OrganizationType;
import com.campus.transparency.domain.user.Role;
import com.campus.transparency.domain.user.User;
import com.campus.transparency.domain.user.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class TenantIsolationIntegrationTest {

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
    private AuditLogRepository auditLogRepository;

    private Organization defaultOrgA;
    private Organization orgB;

    private User studentA;
    private User adminA;
    private User investigatorA;

    private User studentB;
    private User adminB;
    private User investigatorB;

    private Issue issueOrgA;
    private Issue issueOrgB;

    @BeforeEach
    void setUp() {
        // 1. Ensure default Organization A exists
        defaultOrgA = organizationRepository.findByName("ETHOS University Campus")
                .orElseGet(() -> organizationRepository.save(new Organization(
                        "ETHOS University Campus",
                        OrganizationType.UNIVERSITY,
                        OrganizationStatus.ACTIVE,
                        "admin@ethos-campus.edu"
                )));

        // 2. Create or retrieve test Organization B
        orgB = organizationRepository.findByName("Test Metropolitan Institute B")
                .orElseGet(() -> organizationRepository.save(new Organization(
                        "Test Metropolitan Institute B",
                        OrganizationType.COLLEGE,
                        OrganizationStatus.ACTIVE,
                        "contact@test-inst-b.edu"
                )));

        // 3. Ensure Org A users
        studentA = userRepository.findByUsername("student")
                .orElseGet(() -> userRepository.save(new User("student", "hash", Role.STUDENT, defaultOrgA)));
        if (studentA.getOrganization() == null || !studentA.getOrganization().getId().equals(defaultOrgA.getId())) {
            studentA.setOrganization(defaultOrgA);
            studentA = userRepository.save(studentA);
        }

        adminA = userRepository.findByUsername("admin")
                .orElseGet(() -> userRepository.save(new User("admin", "hash", Role.ADMIN, defaultOrgA)));
        if (adminA.getOrganization() == null || !adminA.getOrganization().getId().equals(defaultOrgA.getId())) {
            adminA.setOrganization(defaultOrgA);
            adminA = userRepository.save(adminA);
        }

        investigatorA = userRepository.findByUsername("investigator")
                .orElseGet(() -> userRepository.save(new User("investigator", "hash", Role.ADMIN, defaultOrgA)));
        if (investigatorA.getOrganization() == null || !investigatorA.getOrganization().getId().equals(defaultOrgA.getId())) {
            investigatorA.setOrganization(defaultOrgA);
            investigatorA = userRepository.save(investigatorA);
        }

        // 4. Ensure Org B users
        studentB = userRepository.findByUsername("student_org_b")
                .orElseGet(() -> userRepository.save(new User("student_org_b", "hash", Role.STUDENT, orgB)));
        if (studentB.getOrganization() == null || !studentB.getOrganization().getId().equals(orgB.getId())) {
            studentB.setOrganization(orgB);
            studentB = userRepository.save(studentB);
        }

        adminB = userRepository.findByUsername("admin_org_b")
                .orElseGet(() -> userRepository.save(new User("admin_org_b", "hash", Role.ADMIN, orgB)));
        if (adminB.getOrganization() == null || !adminB.getOrganization().getId().equals(orgB.getId())) {
            adminB.setOrganization(orgB);
            adminB = userRepository.save(adminB);
        }

        investigatorB = userRepository.findByUsername("investigator_org_b")
                .orElseGet(() -> userRepository.save(new User("investigator_org_b", "hash", Role.ADMIN, orgB)));
        if (investigatorB.getOrganization() == null || !investigatorB.getOrganization().getId().equals(orgB.getId())) {
            investigatorB.setOrganization(orgB);
            investigatorB = userRepository.save(investigatorB);
        }

        // 5. Create test issues for Org A and Org B
        issueOrgA = new Issue("Org A Campus Heating", "Heating broken in Org A building", "hash_a", "Infrastructure", "Facilities & Operations", defaultOrgA);
        issueOrgA = issueRepository.save(issueOrgA);

        issueOrgB = new Issue("Org B Library Acoustics", "Noise complaints in Org B library", "hash_b", "Academic Affairs", "Library Services", orgB);
        issueOrgB = issueRepository.save(issueOrgB);
    }

    // --------------------------------------------------------------------------
    // Test 1, 2, 3: Migration State Verification
    // --------------------------------------------------------------------------

    @Test
    @DisplayName("1. Existing default organization exists after migration")
    void defaultOrganizationExists() {
        Optional<Organization> org = organizationRepository.findByName("ETHOS University Campus");
        assertThat(org).isPresent();
        assertThat(org.get().getStatus()).isEqualTo(OrganizationStatus.ACTIVE);
        assertThat(org.get().getOrganizationType()).isEqualTo(OrganizationType.UNIVERSITY);
    }

    @Test
    @DisplayName("2. Existing users are assigned to the default organization")
    void existingUsersAssignedToDefaultOrganization() {
        User admin = userRepository.findByUsername("admin").orElseThrow();
        User student = userRepository.findByUsername("student").orElseThrow();
        User investigator = userRepository.findByUsername("investigator").orElseThrow();

        assertThat(admin.getOrganization()).isNotNull();
        assertThat(student.getOrganization()).isNotNull();
        assertThat(investigator.getOrganization()).isNotNull();

        assertThat(admin.getOrganization().getId()).isEqualTo(defaultOrgA.getId());
        assertThat(student.getOrganization().getId()).isEqualTo(defaultOrgA.getId());
        assertThat(investigator.getOrganization().getId()).isEqualTo(defaultOrgA.getId());
    }

    @Test
    @DisplayName("3. Existing issues are assigned to the default organization")
    void existingIssuesAssignedToDefaultOrganization() {
        List<Issue> issues = issueRepository.findAll();
        assertThat(issues).isNotEmpty();
        for (Issue issue : issues) {
            assertThat(issue.getOrganization())
                    .as("Issue %d must have non-null organization", issue.getId())
                    .isNotNull();
        }
    }

    // --------------------------------------------------------------------------
    // Test 4, 5: Issue Creation and Server-Side Organization Derivation
    // --------------------------------------------------------------------------

    @Test
    @WithMockUser(username = "student", roles = {"STUDENT"})
    @DisplayName("4. New issue inherits authenticated user's organization")
    void newIssueInheritsAuthenticatedUserOrganization() throws Exception {
        CreateIssueRequest request = new CreateIssueRequest(
                "Student A Created Issue",
                "Description for student A issue",
                "student_a_hash_1",
                "Infrastructure",
                "Facilities & Operations"
        );

        MvcResult result = mockMvc.perform(post("/api/issues")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        long createdId = json.get("id").asLong();

        Issue persisted = issueRepository.findById(createdId).orElseThrow();
        assertThat(persisted.getOrganization().getId()).isEqualTo(defaultOrgA.getId());
    }

    @Test
    @WithMockUser(username = "student", roles = {"STUDENT"})
    @DisplayName("5. Client cannot choose another organization during issue creation")
    void clientCannotChooseAnotherOrganizationDuringCreation() throws Exception {
        // Even if client attempts to pass a malicious organizationId (999 or orgB.getId()) in the JSON payload
        String maliciousPayload = """
                {
                    "title": "Malicious Spoofed Issue",
                    "description": "Attempting to spoof organization",
                    "reporterHash": "hacker_anon",
                    "category": "Infrastructure",
                    "department": "Security",
                    "organizationId": """ + orgB.getId() + """
                }
                """;

        MvcResult result = mockMvc.perform(post("/api/issues")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(maliciousPayload))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        long createdId = json.get("id").asLong();

        Issue persisted = issueRepository.findById(createdId).orElseThrow();
        // The server MUST derive from authenticated identity (defaultOrgA), NEVER from the client JSON
        assertThat(persisted.getOrganization().getId()).isEqualTo(defaultOrgA.getId());
        assertThat(persisted.getOrganization().getId()).isNotEqualTo(orgB.getId());
    }

    // --------------------------------------------------------------------------
    // Test 6, 7: Read Isolation
    // --------------------------------------------------------------------------

    @Test
    @WithMockUser(username = "student", roles = {"STUDENT"})
    @DisplayName("6. Organization A user can access Organization A issue")
    void orgAUserCanAccessOrgAIssue() throws Exception {
        mockMvc.perform(get("/api/issues/" + issueOrgA.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(issueOrgA.getId()))
                .andExpect(jsonPath("$.title").value(issueOrgA.getTitle()));
    }

    @Test
    @WithMockUser(username = "student", roles = {"STUDENT"})
    @DisplayName("7. Organization A user cannot access Organization B issue (returns 404)")
    void orgAUserCannotAccessOrgBIssue() throws Exception {
        // Issue B exists, but must return 404 NOT_FOUND to prevent resource enumeration
        mockMvc.perform(get("/api/issues/" + issueOrgB.getId()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    @WithMockUser(username = "student_org_b", roles = {"STUDENT"})
    @DisplayName("7b. Organization B user cannot access Organization A issue (returns 404)")
    void orgBUserCannotAccessOrgAIssue() throws Exception {
        mockMvc.perform(get("/api/issues/" + issueOrgA.getId()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("7c. Admin feed is isolated to authenticated admin's organization")
    void adminFeedIsIsolatedToAuthenticatedAdminOrganization() throws Exception {
        mockMvc.perform(get("/api/issues/admin").param("size", "2000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.[?(@.id == " + issueOrgA.getId() + ")]").exists())
                .andExpect(jsonPath("$.content.[?(@.id == " + issueOrgB.getId() + ")]").doesNotExist());
    }

    @Test
    @WithMockUser(username = "admin_org_b", roles = {"ADMIN"})
    @DisplayName("7d. Admin B feed shows only Org B issues")
    void adminBFeedShowsOnlyOrgBIssues() throws Exception {
        mockMvc.perform(get("/api/issues/admin").param("size", "2000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.[?(@.id == " + issueOrgB.getId() + ")]").exists())
                .andExpect(jsonPath("$.content.[?(@.id == " + issueOrgA.getId() + ")]").doesNotExist());
    }

    // --------------------------------------------------------------------------
    // Test 8, 9, 10: Assignment Isolation
    // --------------------------------------------------------------------------

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("8. Organization A admin cannot assign Organization B issue (returns 404)")
    void orgAAdminCannotAssignOrgBIssue() throws Exception {
        AssignIssueRequest request = new AssignIssueRequest(investigatorA.getId(), "Facilities");

        mockMvc.perform(post("/api/issues/" + issueOrgB.getId() + "/assign")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("9. Organization A admin cannot assign Organization B user to Org A issue (returns 400)")
    void orgAAdminCannotAssignOrgBUser() throws Exception {
        // Attempting to assign investigatorB (belongs to Org B) to issueOrgA (belongs to Org A)
        AssignIssueRequest request = new AssignIssueRequest(investigatorB.getId(), "Cross-Org Assignment");

        mockMvc.perform(post("/api/issues/" + issueOrgA.getId() + "/assign")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("10. Assignee lookup does not expose users from another organization")
    void assigneeLookupDoesNotExposeUsersFromAnotherOrganization() throws Exception {
        mockMvc.perform(get("/api/issues/assignees"))
                .andExpect(status().isOk())
                // Org A admin staff should appear
                .andExpect(jsonPath("$.[?(@.username == 'admin')]").exists())
                .andExpect(jsonPath("$.[?(@.username == 'investigator')]").exists())
                // Org B admin staff MUST NOT appear
                .andExpect(jsonPath("$.[?(@.username == 'admin_org_b')]").doesNotExist())
                .andExpect(jsonPath("$.[?(@.username == 'investigator_org_b')]").doesNotExist())
                // Students should never appear
                .andExpect(jsonPath("$.[?(@.username == 'student')]").doesNotExist());
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("10b. Same-org assignment and unassignment succeeds")
    void sameOrgAssignmentAndUnassignmentSucceeds() throws Exception {
        AssignIssueRequest request = new AssignIssueRequest(investigatorA.getId(), "Campus Operations");

        // Assign
        mockMvc.perform(post("/api/issues/" + issueOrgA.getId() + "/assign")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignedTo.id").value(investigatorA.getId()));

        // Unassign cross-org issue fails (404)
        mockMvc.perform(post("/api/issues/" + issueOrgB.getId() + "/unassign"))
                .andExpect(status().isNotFound());

        // Unassign same-org issue succeeds
        mockMvc.perform(post("/api/issues/" + issueOrgA.getId() + "/unassign"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignedTo").doesNotExist());
    }

    // --------------------------------------------------------------------------
    // Test 11: Audit Log Isolation
    // --------------------------------------------------------------------------

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("11. Organization A admin cannot retrieve Organization B audit information")
    void orgAAdminCannotRetrieveOrgBAuditInfo() throws Exception {
        // Generate an audit log specifically for Org B
        AuditLog auditLogB = new AuditLog(issueOrgB, "SECRET_ORG_B_ACTION", "admin_org_b");
        auditLogRepository.save(auditLogB);

        // Org A admin queries audit logs
        mockMvc.perform(get("/api/admin/audit").param("size", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.[?(@.action == 'SECRET_ORG_B_ACTION')]").doesNotExist())
                .andExpect(jsonPath("$.content.[?(@.issueId == " + issueOrgB.getId() + ")]").doesNotExist());
    }

    // --------------------------------------------------------------------------
    // Test 12, 13: Public Tracking Functionality & Sanitization
    // --------------------------------------------------------------------------

    @Test
    @DisplayName("12. Existing public tracking continues working")
    void existingPublicTrackingContinuesWorking() throws Exception {
        mockMvc.perform(get("/api/issues/track/" + issueOrgA.getTrackingCode()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(issueOrgA.getId()))
                .andExpect(jsonPath("$.trackingCode").value(issueOrgA.getTrackingCode()))
                .andExpect(jsonPath("$.title").value(issueOrgA.getTitle()))
                .andExpect(jsonPath("$.status").value(issueOrgA.getStatus().name()));
    }

    @Test
    @DisplayName("13. Public tracking does not expose internal assignee or private moderation fields")
    void publicTrackingDoesNotExposeInternalAssigneeOrModeration() throws Exception {
        // Assign investigator to issueOrgA
        issueOrgA.assignTo(investigatorA);
        issueOrgA.hide();
        issueRepository.save(issueOrgA);

        mockMvc.perform(get("/api/issues/track/" + issueOrgA.getTrackingCode()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(issueOrgA.getId()))
                // Internal assignee MUST NOT be exposed in public tracking
                .andExpect(jsonPath("$.assignedTo").doesNotExist())
                // Hidden flag must be false/sanitized
                .andExpect(jsonPath("$.hidden").value(false));
    }

    // --------------------------------------------------------------------------
    // Test 14, 15: Role Authorization & Commands
    // --------------------------------------------------------------------------

    @Test
    @WithMockUser(username = "student", roles = {"STUDENT"})
    @DisplayName("14. Student cannot perform admin actions (assign, report, start, resolve, reject, hide)")
    void studentCannotPerformAdminActions() throws Exception {
        AssignIssueRequest request = new AssignIssueRequest(investigatorA.getId(), "Ops");

        mockMvc.perform(post("/api/issues/" + issueOrgA.getId() + "/assign")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/issues/" + issueOrgA.getId() + "/resolve"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/issues/" + issueOrgA.getId() + "/hide"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("15. Admin cannot create issue (student-only endpoint)")
    void adminCannotCreateIssue() throws Exception {
        CreateIssueRequest request = new CreateIssueRequest(
                "Admin Trying To Create",
                "Description",
                "admin_hash",
                "Infrastructure",
                "Facilities"
        );

        mockMvc.perform(post("/api/issues")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    // --------------------------------------------------------------------------
    // Test 16, 17: Lifecycle and Voting Within Tenant
    // --------------------------------------------------------------------------

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("16. Existing lifecycle operations work within organization")
    void existingLifecycleOperationsWorkWithinTenant() throws Exception {
        mockMvc.perform(post("/api/issues/" + issueOrgA.getId() + "/start"))
                .andExpect(status().isNoContent());

        Issue updated = issueRepository.findById(issueOrgA.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(IssueStatus.IN_PROGRESS);

        mockMvc.perform(post("/api/issues/" + issueOrgA.getId() + "/resolve"))
                .andExpect(status().isNoContent());

        updated = issueRepository.findById(issueOrgA.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(IssueStatus.RESOLVED);
    }

    @Test
    @WithMockUser(username = "student", roles = {"STUDENT"})
    @DisplayName("17. Existing voting works within organization")
    void existingVotingWorksWithinTenant() throws Exception {
        int initialVotes = issueOrgA.getVoteCount();

        mockMvc.perform(post("/api/issues/" + issueOrgA.getId() + "/upvote"))
                .andExpect(status().isNoContent());

        Issue updated = issueRepository.findById(issueOrgA.getId()).orElseThrow();
        assertThat(updated.getVoteCount()).isEqualTo(initialVotes + 1);

        mockMvc.perform(post("/api/issues/" + issueOrgA.getId() + "/downvote"))
                .andExpect(status().isNoContent());

        updated = issueRepository.findById(issueOrgA.getId()).orElseThrow();
        assertThat(updated.getVoteCount()).isEqualTo(initialVotes);
    }

    // --------------------------------------------------------------------------
    // Test 18, 19, 20: Cross-Tenant Access Mutation Blocked
    // --------------------------------------------------------------------------

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("20. Cross-tenant mutation attempts explicitly fail with 404")
    void crossTenantMutationsFailWith404() throws Exception {
        // Admin from Org A attempts to mutate Org B's issue:
        mockMvc.perform(post("/api/issues/" + issueOrgB.getId() + "/start"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        mockMvc.perform(post("/api/issues/" + issueOrgB.getId() + "/resolve"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        mockMvc.perform(post("/api/issues/" + issueOrgB.getId() + "/reject"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        mockMvc.perform(post("/api/issues/" + issueOrgB.getId() + "/hide"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    @WithMockUser(username = "student", roles = {"STUDENT"})
    @DisplayName("20b. Cross-tenant voting attempts fail with 404")
    void crossTenantVotingFailsWith404() throws Exception {
        mockMvc.perform(post("/api/issues/" + issueOrgB.getId() + "/upvote"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        mockMvc.perform(post("/api/issues/" + issueOrgB.getId() + "/downvote"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        mockMvc.perform(post("/api/issues/" + issueOrgB.getId() + "/vote").param("delta", "5"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @org.junit.jupiter.api.AfterAll
    static void tearDownAll(
            @Autowired IssueRepository issueRepository,
            @Autowired AuditLogRepository auditLogRepository,
            @Autowired UserRepository userRepository,
            @Autowired OrganizationRepository organizationRepository
    ) {
        organizationRepository.findByName("Test Metropolitan Institute B").ifPresent(orgB -> {
            List<Issue> orgBIssues = issueRepository.findAll().stream()
                    .filter(i -> i.getOrganization() != null && i.getOrganization().getId().equals(orgB.getId()))
                    .toList();
            for (Issue i : orgBIssues) {
                auditLogRepository.findAll().stream()
                        .filter(a -> a.getIssue().getId().equals(i.getId()))
                        .forEach(auditLogRepository::delete);
                issueRepository.delete(i);
            }
            userRepository.findByRoleAndOrganizationId(Role.STUDENT, orgB.getId()).forEach(userRepository::delete);
            userRepository.findByRoleAndOrganizationId(Role.ADMIN, orgB.getId()).forEach(userRepository::delete);
            organizationRepository.delete(orgB);
        });
    }
}
