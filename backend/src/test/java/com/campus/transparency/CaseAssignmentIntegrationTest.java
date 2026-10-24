package com.campus.transparency;

import com.campus.transparency.api.issue.AssignIssueRequest;
import com.campus.transparency.domain.audit.AuditLog;
import com.campus.transparency.domain.audit.AuditLogRepository;
import com.campus.transparency.domain.issue.Issue;
import com.campus.transparency.domain.issue.IssueRepository;
import com.campus.transparency.domain.user.Role;
import com.campus.transparency.domain.user.User;
import com.campus.transparency.domain.user.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class CaseAssignmentIntegrationTest {

    static {
        com.campus.transparency.config.DotenvLoader.load();
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private IssueRepository issueRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private com.campus.transparency.domain.organization.OrganizationRepository organizationRepository;

    private com.campus.transparency.domain.organization.Organization defaultOrg;
    private User adminUser;
    private User investigatorUser;
    private User studentUser;
    private Issue testIssue;

    @BeforeEach
    void setUp() {
        defaultOrg = organizationRepository.findByName("ETHOS University Campus")
                .orElseGet(() -> organizationRepository.save(new com.campus.transparency.domain.organization.Organization(
                        "ETHOS University Campus",
                        com.campus.transparency.domain.organization.OrganizationType.UNIVERSITY,
                        com.campus.transparency.domain.organization.OrganizationStatus.ACTIVE,
                        "admin@ethos-campus.edu"
                )));

        adminUser = userRepository.findByUsername("admin")
                .orElseGet(() -> userRepository.save(new User("admin", "hash", Role.ADMIN, defaultOrg)));
        if (adminUser.getOrganization() == null) {
            adminUser.setOrganization(defaultOrg);
            adminUser = userRepository.save(adminUser);
        }

        investigatorUser = userRepository.findByUsername("investigator")
                .orElseGet(() -> userRepository.save(new User("investigator", "hash", Role.ADMIN, defaultOrg)));
        if (investigatorUser.getOrganization() == null) {
            investigatorUser.setOrganization(defaultOrg);
            investigatorUser = userRepository.save(investigatorUser);
        }

        studentUser = userRepository.findByUsername("student")
                .orElseGet(() -> userRepository.save(new User("student", "hash", Role.STUDENT, defaultOrg)));
        if (studentUser.getOrganization() == null) {
            studentUser.setOrganization(defaultOrg);
            studentUser = userRepository.save(studentUser);
        }

        testIssue = new Issue("Integration Test Issue", "Case Assignment Test Description", "test_hash", "Infrastructure", "Facilities & Operations", defaultOrg);
        testIssue = issueRepository.save(testIssue);
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void adminAssignsValidUserAndPersistsInDatabase() throws Exception {
        AssignIssueRequest request = new AssignIssueRequest(investigatorUser.getId(), "Campus Safety");

        mockMvc.perform(post("/api/issues/{id}/assign", testIssue.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(testIssue.getId()))
                .andExpect(jsonPath("$.department").value("Campus Safety"))
                .andExpect(jsonPath("$.assignedTo.id").value(investigatorUser.getId()))
                .andExpect(jsonPath("$.assignedTo.username").value("investigator"));

        // Verify database persistence
        Issue updated = issueRepository.findById(testIssue.getId()).orElseThrow();
        assertThat(updated.getAssignedTo()).isNotNull();
        assertThat(updated.getAssignedTo().getId()).isEqualTo(investigatorUser.getId());
        assertThat(updated.getDepartment()).isEqualTo("Campus Safety");

        // Verify GET /api/issues/{id} detail view shows assignment
        mockMvc.perform(get("/api/issues/{id}", testIssue.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignedTo.id").value(investigatorUser.getId()))
                .andExpect(jsonPath("$.assignedTo.username").value("investigator"));

        // Verify audit log
        List<AuditLog> logs = auditLogRepository.findAll();
        boolean hasAssignmentLog = logs.stream()
                .anyMatch(l -> l.getIssue().getId().equals(testIssue.getId())
                        && "ISSUE_ASSIGNED".equals(l.getAction())
                        && l.getActor().contains("investigator"));
        assertThat(hasAssignmentLog).isTrue();
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void adminUnassignsClearsAssignmentAndLogsAudit() throws Exception {
        // First assign
        testIssue.assignTo(investigatorUser);
        issueRepository.save(testIssue);

        mockMvc.perform(post("/api/issues/{id}/unassign", testIssue.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(testIssue.getId()))
                .andExpect(jsonPath("$.assignedTo").doesNotExist());

        // Verify database persistence
        Issue updated = issueRepository.findById(testIssue.getId()).orElseThrow();
        assertThat(updated.getAssignedTo()).isNull();

        // Verify audit log
        List<AuditLog> logs = auditLogRepository.findAll();
        boolean hasUnassignedLog = logs.stream()
                .anyMatch(l -> l.getIssue().getId().equals(testIssue.getId())
                        && "ISSUE_UNASSIGNED".equals(l.getAction()));
        assertThat(hasUnassignedLog).isTrue();
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void adminFeedFiltersByDepartment() throws Exception {
        testIssue.setDepartment("Academic Affairs");
        issueRepository.save(testIssue);

        mockMvc.perform(get("/api/issues/admin")
                        .param("department", "Academic Affairs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.[?(@.id == " + testIssue.getId() + ")]").exists());

        mockMvc.perform(get("/api/issues/admin")
                        .param("department", "NonExistentDept999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.[?(@.id == " + testIssue.getId() + ")]").doesNotExist());
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void getAssigneesReturnsAdminStaff() throws Exception {
        mockMvc.perform(get("/api/issues/assignees"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.[?(@.username == 'admin')]").exists())
                .andExpect(jsonPath("$.[?(@.username == 'investigator')]").exists())
                .andExpect(jsonPath("$.[?(@.username == 'student')]").doesNotExist());
    }

    @Test
    @WithMockUser(username = "student", roles = {"STUDENT"})
    void studentCannotAssign() throws Exception {
        AssignIssueRequest request = new AssignIssueRequest(investigatorUser.getId(), "IT Services");

        mockMvc.perform(post("/api/issues/{id}/assign", testIssue.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "student", roles = {"STUDENT"})
    void studentCannotUnassign() throws Exception {
        mockMvc.perform(post("/api/issues/{id}/unassign", testIssue.getId()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void assignNonexistentUserReturns4xx() throws Exception {
        AssignIssueRequest request = new AssignIssueRequest(999999L, "IT Services");

        mockMvc.perform(post("/api/issues/{id}/assign", testIssue.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void cannotAssignStudentUser() throws Exception {
        AssignIssueRequest request = new AssignIssueRequest(studentUser.getId(), "IT Services");

        mockMvc.perform(post("/api/issues/{id}/assign", testIssue.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void assignNonexistentIssueReturns404() throws Exception {
        AssignIssueRequest request = new AssignIssueRequest(investigatorUser.getId(), "IT Services");

        mockMvc.perform(post("/api/issues/{id}/assign", 999999L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void existingIssuesWithNoAssigneeStillWork() throws Exception {
        mockMvc.perform(get("/api/issues/{id}", testIssue.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(testIssue.getId()))
                .andExpect(jsonPath("$.assignedTo").doesNotExist());
    }
}
