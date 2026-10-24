package com.campus.transparency;

import com.campus.transparency.api.organization.CreateOrganizationApplicationRequest;
import com.campus.transparency.api.organization.RejectOrganizationApplicationRequest;
import com.campus.transparency.domain.organization.*;
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

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class OrganizationApplicationIntegrationTest {

    static {
        com.campus.transparency.config.DotenvLoader.load();
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private OrganizationApplicationRepository applicationRepository;

    @Autowired
    private OrganizationApplicationAuditLogRepository auditLogRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static Long submittedApplicationId;
    private static Long rejectedApplicationId;

    @Test
    @Order(1)
    @DisplayName("1. Public user can submit valid organization application")
    void publicUserCanSubmitValidApplication() throws Exception {
        CreateOrganizationApplicationRequest req = new CreateOrganizationApplicationRequest(
                "Apex Technical Institute",
                OrganizationType.COLLEGE,
                "contact@apextech.edu",
                "Dr. Jane Doe",
                "123 Innovation Way, Tech Park",
                "https://apextech.edu",
                "A leading technical college focused on ethical engineering.",
                "dean@apextech.edu",
                "apex_admin",
                "secureApexPass123"
        );

        MvcResult result = mockMvc.perform(post("/api/organization-applications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.organizationName").value("Apex Technical Institute"))
                .andExpect(jsonPath("$.organizationType").value("COLLEGE"))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.requestedAdminUsername").value("apex_admin"))
                .andReturn();

        JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
        submittedApplicationId = node.get("id").asLong();

        // 3. Application initially has PENDING status in database
        Optional<OrganizationApplication> saved = applicationRepository.findById(submittedApplicationId);
        assertThat(saved).isPresent();
        assertThat(saved.get().getStatus()).isEqualTo(ApplicationStatus.PENDING);

        // 4. Password is never stored in plaintext
        assertThat(saved.get().getRequestedAdminPasswordHash()).isNotEqualTo("secureApexPass123");
        assertThat(passwordEncoder.matches("secureApexPass123", saved.get().getRequestedAdminPasswordHash())).isTrue();

        // 5. Password hash is not returned in API response
        assertThat(result.getResponse().getContentAsString()).doesNotContain("password");
        assertThat(result.getResponse().getContentAsString()).doesNotContain("secureApexPass123");
        assertThat(result.getResponse().getContentAsString()).doesNotContain(saved.get().getRequestedAdminPasswordHash());
    }

    @Test
    @Order(2)
    @DisplayName("2. Invalid application is rejected with validation error")
    void invalidApplicationRejectedWithValidationError() throws Exception {
        CreateOrganizationApplicationRequest invalidReq = new CreateOrganizationApplicationRequest(
                "", // Blank name
                null, // Null type
                "not-an-email", // Invalid email
                "",
                "",
                null,
                "",
                "invalid-admin-email",
                "a", // Too short username
                "123" // Too short password
        );

        mockMvc.perform(post("/api/organization-applications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @Order(3)
    @DisplayName("2b. Duplicate application with same organization name or email is rejected")
    void duplicateApplicationIsRejected() throws Exception {
        CreateOrganizationApplicationRequest dupReq = new CreateOrganizationApplicationRequest(
                "Apex Technical Institute", // Same name as pending
                OrganizationType.COLLEGE,
                "different@apextech.edu",
                "Dr. Jane Doe",
                "123 Innovation Way",
                null,
                "Description",
                "admin2@apextech.edu",
                "apex_admin_2",
                "password123"
        );

        mockMvc.perform(post("/api/organization-applications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dupReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
    }

    @Test
    @Order(4)
    @WithMockUser(username = "student", roles = {"STUDENT"})
    @DisplayName("6. Normal student cannot access application-review endpoints")
    void studentCannotAccessReviewEndpoints() throws Exception {
        mockMvc.perform(get("/api/admin/organization-applications"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/organization-applications/" + submittedApplicationId))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/admin/organization-applications/" + submittedApplicationId + "/approve"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/admin/organization-applications/" + submittedApplicationId + "/reject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Testing student rejection\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(5)
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("7. Existing organization admin cannot access application-review endpoints")
    void orgAdminCannotAccessReviewEndpoints() throws Exception {
        mockMvc.perform(get("/api/admin/organization-applications"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/organization-applications/" + submittedApplicationId))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/admin/organization-applications/" + submittedApplicationId + "/approve"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/admin/organization-applications/" + submittedApplicationId + "/reject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Testing admin rejection\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(6)
    @WithMockUser(username = "superadmin", roles = {"SUPER_ADMIN"})
    @DisplayName("8 & 9. SUPER_ADMIN can list and retrieve pending applications")
    void superAdminCanListAndRetrieveApplications() throws Exception {
        mockMvc.perform(get("/api/admin/organization-applications")
                        .param("status", "PENDING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.[?(@.id == " + submittedApplicationId + ")]").exists());

        mockMvc.perform(get("/api/admin/organization-applications/" + submittedApplicationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(submittedApplicationId))
                .andExpect(jsonPath("$.organizationName").value("Apex Technical Institute"))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    @Order(7)
    @WithMockUser(username = "superadmin", roles = {"SUPER_ADMIN"})
    @DisplayName("10-15. SUPER_ADMIN can approve a pending application; creates ACTIVE organization and admin user")
    void superAdminCanApprovePendingApplication() throws Exception {
        mockMvc.perform(post("/api/admin/organization-applications/" + submittedApplicationId + "/approve"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(submittedApplicationId))
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.reviewedBy").value("superadmin"))
                .andExpect(jsonPath("$.approvedOrganizationId").exists());

        // 11. Approval creates ACTIVE organization
        Optional<Organization> createdOrg = organizationRepository.findByName("Apex Technical Institute");
        assertThat(createdOrg).isPresent();
        assertThat(createdOrg.get().getStatus()).isEqualTo(OrganizationStatus.ACTIVE);
        assertThat(createdOrg.get().getOrganizationType()).isEqualTo(OrganizationType.COLLEGE);

        // 12 & 13. Approval creates requested organization administrator belonging to new organization
        Optional<User> createdAdmin = userRepository.findByUsername("apex_admin");
        assertThat(createdAdmin).isPresent();
        assertThat(createdAdmin.get().getRole()).isEqualTo(Role.ADMIN);
        assertThat(createdAdmin.get().getOrganization()).isNotNull();
        assertThat(createdAdmin.get().getOrganization().getId()).isEqualTo(createdOrg.get().getId());

        // 14 & 15. Marks application APPROVED and records reviewer and timestamp
        OrganizationApplication app = applicationRepository.findById(submittedApplicationId).orElseThrow();
        assertThat(app.getStatus()).isEqualTo(ApplicationStatus.APPROVED);
        assertThat(app.getReviewedBy()).isEqualTo("superadmin");
        assertThat(app.getReviewedAt()).isNotNull();

        // Audit log exists
        var audits = auditLogRepository.findByApplicationIdOrderByCreatedAtDesc(submittedApplicationId);
        assertThat(audits).isNotEmpty();
        assertThat(audits.stream().anyMatch(a -> "APPLICATION_APPROVED".equals(a.getAction()))).isTrue();
    }

    @Test
    @Order(8)
    @WithMockUser(username = "superadmin", roles = {"SUPER_ADMIN"})
    @DisplayName("18. SUPER_ADMIN cannot approve an already approved application")
    void cannotApproveAlreadyApprovedApplication() throws Exception {
        mockMvc.perform(post("/api/admin/organization-applications/" + submittedApplicationId + "/approve"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
    }

    @Test
    @Order(9)
    @DisplayName("20-24. Rejection flow: submission, non-empty reason validation, rejection recording, no org/admin created")
    void rejectionFlowValidation() throws Exception {
        // Create second application for rejection test
        CreateOrganizationApplicationRequest req2 = new CreateOrganizationApplicationRequest(
                "Horizon High School",
                OrganizationType.SCHOOL,
                "info@horizonhigh.edu",
                "Principal Skinner",
                "742 Evergreen Terrace",
                null,
                "A regional secondary school.",
                "admin@horizonhigh.edu",
                "horizon_admin",
                "secureHorizon123"
        );

        MvcResult res2 = mockMvc.perform(post("/api/organization-applications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req2)))
                .andExpect(status().isCreated())
                .andReturn();

        rejectedApplicationId = objectMapper.readTree(res2.getResponse().getContentAsString()).get("id").asLong();

        // 20. Rejection requires non-empty reason
        mockMvc.perform(post("/api/admin/organization-applications/" + rejectedApplicationId + "/reject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"   \"}"))
                .andExpect(status().isForbidden()); // Unauthenticated / non-superadmin check

        // 20b. Non-empty reason validation under SUPER_ADMIN
        mockMvc.perform(post("/api/admin/organization-applications/" + rejectedApplicationId + "/reject")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("superadmin").roles("SUPER_ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        // Valid rejection under SUPER_ADMIN
        RejectOrganizationApplicationRequest validReject = new RejectOrganizationApplicationRequest(
                "Insufficient institutional documentation provided."
        );

        mockMvc.perform(post("/api/admin/organization-applications/" + rejectedApplicationId + "/reject")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("superadmin").roles("SUPER_ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validReject)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.rejectionReason").value("Insufficient institutional documentation provided."))
                .andExpect(jsonPath("$.reviewedBy").value("superadmin"));

        // 21 & 22. Rejection stores reason, reviewer, timestamp
        OrganizationApplication rejectedApp = applicationRepository.findById(rejectedApplicationId).orElseThrow();
        assertThat(rejectedApp.getStatus()).isEqualTo(ApplicationStatus.REJECTED);
        assertThat(rejectedApp.getRejectionReason()).isEqualTo("Insufficient institutional documentation provided.");
        assertThat(rejectedApp.getReviewedBy()).isEqualTo("superadmin");
        assertThat(rejectedApp.getReviewedAt()).isNotNull();

        // 23 & 24. Rejected application does not create an organization or administrator
        assertThat(organizationRepository.findByName("Horizon High School")).isEmpty();
        assertThat(userRepository.findByUsername("horizon_admin")).isEmpty();

        // 19. Cannot approve a rejected application
        mockMvc.perform(post("/api/admin/organization-applications/" + rejectedApplicationId + "/approve")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("superadmin").roles("SUPER_ADMIN")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
    }

    @Test
    @Order(10)
    @DisplayName("25 & 26. Newly approved organization administrator can authenticate and operate only in own tenant")
    void approvedAdminCanAuthenticateAndOperatesWithinOwnTenant() throws Exception {
        // Authenticate with newly approved admin credentials
        String loginJson = "{\"username\":\"apex_admin\",\"password\":\"secureApexPass123\"}";
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andReturn();

        String token = objectMapper.readTree(loginResult.getResponse().getContentAsString()).get("token").asText();

        // Check profile
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("apex_admin"))
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.organization.name").value("Apex Technical Institute"));

        // Admin cannot access SUPER_ADMIN review endpoints
        mockMvc.perform(get("/api/admin/organization-applications")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(11)
    @DisplayName("Suspended organization user cannot authenticate or operate")
    void suspendedOrganizationUserCannotAuthenticate() throws Exception {
        Organization org = organizationRepository.findByName("Apex Technical Institute").orElseThrow();
        org.setStatus(OrganizationStatus.SUSPENDED);
        organizationRepository.save(org);

        // Attempt login while organization is suspended
        String loginJson = "{\"username\":\"apex_admin\",\"password\":\"secureApexPass123\"}";
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson))
                .andExpect(status().isUnauthorized());

        // Restore organization status for cleanup
        org.setStatus(OrganizationStatus.ACTIVE);
        organizationRepository.save(org);
    }

    @AfterAll
    static void cleanup(
            @Autowired OrganizationApplicationRepository applicationRepository,
            @Autowired OrganizationApplicationAuditLogRepository auditLogRepository,
            @Autowired OrganizationRepository organizationRepository,
            @Autowired UserRepository userRepository
    ) {
        // Clean up test data created during test run
        userRepository.findByUsername("apex_admin").ifPresent(userRepository::delete);
        userRepository.findByUsername("horizon_admin").ifPresent(userRepository::delete);

        if (submittedApplicationId != null) {
            auditLogRepository.findByApplicationIdOrderByCreatedAtDesc(submittedApplicationId)
                    .forEach(auditLogRepository::delete);
            applicationRepository.deleteById(submittedApplicationId);
        }

        if (rejectedApplicationId != null) {
            auditLogRepository.findByApplicationIdOrderByCreatedAtDesc(rejectedApplicationId)
                    .forEach(auditLogRepository::delete);
            applicationRepository.deleteById(rejectedApplicationId);
        }

        organizationRepository.findByName("Apex Technical Institute").ifPresent(organizationRepository::delete);
        organizationRepository.findByName("Horizon High School").ifPresent(organizationRepository::delete);
    }
}
