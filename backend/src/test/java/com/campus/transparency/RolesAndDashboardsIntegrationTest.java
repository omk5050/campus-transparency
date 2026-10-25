package com.campus.transparency;

import com.campus.transparency.api.issue.AssignIssueRequest;
import com.campus.transparency.api.issue.CreateIssueRequest;
import com.campus.transparency.api.message.CreateIssueMessageRequest;
import com.campus.transparency.api.note.CreateInternalNoteRequest;
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
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class RolesAndDashboardsIntegrationTest {

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

    private Organization testOrgA;
    private Organization testOrgB;

    private User studentA1;
    private User studentA2;
    private User investigatorA;
    private User adminA;

    private User studentB;
    private User investigatorB;
    private User adminB;

    private User superAdmin;

    private Issue issueA1; // Reported by studentA1 in testOrgA
    private Issue issueA2; // Reported by studentA2 in testOrgA
    private Issue issueB1; // Reported by studentB in testOrgB

    @BeforeEach
    void setUp() {
        String runSuffix = "_" + System.currentTimeMillis();

        testOrgA = organizationRepository.save(new Organization(
                "Dash Alpha University " + runSuffix,
                OrganizationType.UNIVERSITY,
                OrganizationStatus.ACTIVE,
                "alpha" + runSuffix + "@dash.edu"
        ));

        testOrgB = organizationRepository.save(new Organization(
                "Dash Beta Institute " + runSuffix,
                OrganizationType.COLLEGE,
                OrganizationStatus.ACTIVE,
                "beta" + runSuffix + "@dash.edu"
        ));

        studentA1 = userRepository.save(new User(
                "student_a1_" + runSuffix,
                "$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi",
                Role.STUDENT,
                testOrgA
        ));

        studentA2 = userRepository.save(new User(
                "student_a2_" + runSuffix,
                "$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi",
                Role.STUDENT,
                testOrgA
        ));

        investigatorA = userRepository.save(new User(
                "investigator_a_" + runSuffix,
                "$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi",
                Role.INVESTIGATOR,
                testOrgA
        ));

        adminA = userRepository.save(new User(
                "admin_a_" + runSuffix,
                "$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi",
                Role.ADMIN,
                testOrgA
        ));

        studentB = userRepository.save(new User(
                "student_b_" + runSuffix,
                "$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi",
                Role.STUDENT,
                testOrgB
        ));

        investigatorB = userRepository.save(new User(
                "investigator_b_" + runSuffix,
                "$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi",
                Role.INVESTIGATOR,
                testOrgB
        ));

        adminB = userRepository.save(new User(
                "admin_b_" + runSuffix,
                "$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi",
                Role.ADMIN,
                testOrgB
        ));

        superAdmin = userRepository.save(new User(
                "super_admin_" + runSuffix,
                "$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi",
                Role.SUPER_ADMIN,
                null
        ));

        issueA1 = issueRepository.save(new Issue(
                "Broken projector in room 101",
                "Projector bulb is flickering constantly",
                null,
                "Academic",
                "IT Support",
                testOrgA,
                null,
                studentA1
        ));

        issueA2 = issueRepository.save(new Issue(
                "Cafeteria water dispenser leak",
                "Puddle forming near entrance",
                null,
                "Facilities",
                "Maintenance",
                testOrgA,
                null,
                studentA2
        ));

        issueB1 = issueRepository.save(new Issue(
                "Beta library WiFi outage",
                "No connection on 3rd floor",
                null,
                "IT",
                "Network",
                testOrgB,
                null,
                studentB
        ));
    }

    @Test
    @Order(1)
    @DisplayName("1. Student dashboard returns only student's own complaints")
    void test1_studentDashboardReturnsOnlyOwnComplaints() throws Exception {
        mockMvc.perform(get("/api/issues/my")
                        .with(user(studentA1.getUsername()).roles("STUDENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].id").value(issueA1.getId()))
                .andExpect(jsonPath("$.content[0].title").value("Broken projector in room 101"));
    }

    @Test
    @Order(2)
    @DisplayName("2. Student cannot access another student's complaint in the same organization (404)")
    void test2_studentCannotAccessAnotherStudentsComplaint() throws Exception {
        mockMvc.perform(get("/api/issues/" + issueA2.getId())
                        .with(user(studentA1.getUsername()).roles("STUDENT")))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(3)
    @DisplayName("3. Student cannot access a complaint from another organization (404)")
    void test3_studentCannotAccessOtherOrgComplaint() throws Exception {
        mockMvc.perform(get("/api/issues/" + issueB1.getId())
                        .with(user(studentA1.getUsername()).roles("STUDENT")))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(4)
    @DisplayName("4. Investigator can access permitted cases in their organization")
    void test4_investigatorCanAccessPermittedCasesInOwnOrg() throws Exception {
        mockMvc.perform(get("/api/issues/" + issueA1.getId())
                        .with(user(investigatorA.getUsername()).roles("INVESTIGATOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(issueA1.getId()))
                .andExpect(jsonPath("$.title").value("Broken projector in room 101"));
    }

    @Test
    @Order(5)
    @DisplayName("5. Investigator cannot access another organization's case (404)")
    void test5_investigatorCannotAccessOtherOrgCase() throws Exception {
        mockMvc.perform(get("/api/issues/" + issueB1.getId())
                        .with(user(investigatorA.getUsername()).roles("INVESTIGATOR")))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(6)
    @DisplayName("6. Investigator can perform permitted case actions (notes, messages, status transitions)")
    void test6_investigatorCanPerformCaseActions() throws Exception {
        // Status transition: startProgress
        mockMvc.perform(post("/api/issues/" + issueA1.getId() + "/start")
                        .with(user(investigatorA.getUsername()).roles("INVESTIGATOR")))
                .andExpect(status().isNoContent());

        // Internal note creation
        CreateInternalNoteRequest noteReq = new CreateInternalNoteRequest("Investigating bulb availability with vendor");
        mockMvc.perform(post("/api/issues/" + issueA1.getId() + "/internal-notes")
                        .with(user(investigatorA.getUsername()).roles("INVESTIGATOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(noteReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content").value("Investigating bulb availability with vendor"));

        // Message creation
        CreateIssueMessageRequest msgReq = new CreateIssueMessageRequest("Technician dispatched to Room 101");
        mockMvc.perform(post("/api/issues/" + issueA1.getId() + "/messages")
                        .with(user(investigatorA.getUsername()).roles("INVESTIGATOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(msgReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content").value("Technician dispatched to Room 101"));
    }

    @Test
    @Order(7)
    @DisplayName("7. Org Admin sees only own organization's cases")
    void test7_orgAdminSeesOnlyOwnOrgCases() throws Exception {
        mockMvc.perform(get("/api/issues/admin")
                        .with(user(adminA.getUsername()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.id == " + issueA1.getId() + ")]").exists())
                .andExpect(jsonPath("$.content[?(@.id == " + issueA2.getId() + ")]").exists())
                .andExpect(jsonPath("$.content[?(@.id == " + issueB1.getId() + ")]").doesNotExist());
    }

    @Test
    @Order(8)
    @DisplayName("8. Org Admin can assign and unassign cases")
    void test8_orgAdminCanAssignAndUnassignCases() throws Exception {
        // Assign to investigatorA
        AssignIssueRequest assignReq = new AssignIssueRequest(investigatorA.getId(), "IT Support");
        mockMvc.perform(post("/api/issues/" + issueA1.getId() + "/assign")
                        .with(user(adminA.getUsername()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignedTo.id").value(investigatorA.getId()));

        // Investigator sees assigned case in /api/issues/assigned
        mockMvc.perform(get("/api/issues/assigned")
                        .with(user(investigatorA.getUsername()).roles("INVESTIGATOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.id == " + issueA1.getId() + ")]").exists());

        // Unassign
        mockMvc.perform(post("/api/issues/" + issueA1.getId() + "/unassign")
                        .with(user(adminA.getUsername()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignedTo").doesNotExist());
    }

    @Test
    @Order(9)
    @DisplayName("9. Org Admin can access organization operational metrics")
    void test9_orgAdminCanAccessOperationalMetrics() throws Exception {
        // Transition one issue to IN_PROGRESS to verify operational metrics reflection
        mockMvc.perform(post("/api/issues/" + issueA1.getId() + "/start")
                        .with(user(adminA.getUsername()).roles("ADMIN")))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/admin/metrics")
                        .with(user(adminA.getUsername()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalComplaints").value(2))
                .andExpect(jsonPath("$.inProgressComplaints").value(1))
                .andExpect(jsonPath("$.reportedComplaints").value(1))
                .andExpect(jsonPath("$.unassignedCases").value(2));
    }

    @Test
    @Order(10)
    @DisplayName("10. Super Admin can access platform-level metrics")
    void test10_superAdminCanAccessPlatformMetrics() throws Exception {
        mockMvc.perform(get("/api/super-admin/metrics")
                        .with(user(superAdmin.getUsername()).roles("SUPER_ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalOrganizations").isNumber())
                .andExpect(jsonPath("$.activeOrganizations").isNumber())
                .andExpect(jsonPath("$.totalComplaints").isNumber());
    }

    @Test
    @Order(11)
    @DisplayName("11. Role-protected endpoints return correct authorization responses")
    void test11_roleProtectedEndpointsEnforceAccess() throws Exception {
        // Student cannot access admin metrics (403)
        mockMvc.perform(get("/api/admin/metrics")
                        .with(user(studentA1.getUsername()).roles("STUDENT")))
                .andExpect(status().isForbidden());

        // Student cannot access super admin metrics (403)
        mockMvc.perform(get("/api/super-admin/metrics")
                        .with(user(studentA1.getUsername()).roles("STUDENT")))
                .andExpect(status().isForbidden());

        // Investigator cannot access admin metrics (403)
        mockMvc.perform(get("/api/admin/metrics")
                        .with(user(investigatorA.getUsername()).roles("INVESTIGATOR")))
                .andExpect(status().isForbidden());

        // Org admin cannot access super admin metrics (403)
        mockMvc.perform(get("/api/super-admin/metrics")
                        .with(user(adminA.getUsername()).roles("ADMIN")))
                .andExpect(status().isForbidden());
    }
}
