package com.campus.transparency;

import com.campus.transparency.api.auth.LoginRequest;
import com.campus.transparency.api.auth.RegisterRequest;
import com.campus.transparency.api.organization.CreateJoinCodeRequest;
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

import com.campus.transparency.testconfig.IsolatedTestDatabase;

@SpringBootTest
@AutoConfigureMockMvc
@IsolatedTestDatabase
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class OrganizationJoinCodeIntegrationTest {

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
    private OrganizationJoinCodeRepository joinCodeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Organization orgAlpha;
    private Organization orgBeta;
    private Organization orgSuspended;

    private final String testSuffix = "_" + System.currentTimeMillis();
    private String freshStudentUsername;
    private String freshInvestigatorUsername;
    private String singleUser1;
    private String singleUser2;
    private String revokedUserTry;
    private String suspendedUser;

    private String studentJoinCodeAlpha;
    private Long studentJoinCodeAlphaId;
    private String adminJoinCodeAlpha;
    private String singleUseJoinCode;
    private String revokedJoinCode;
    private Long revokedJoinCodeId;
    private Long joinCodeBetaId;

    @BeforeAll
    void setupTestData() {
        freshStudentUsername = "f_stu" + testSuffix;
        freshInvestigatorUsername = "f_inv" + testSuffix;
        singleUser1 = "sing_1" + testSuffix;
        singleUser2 = "sing_2" + testSuffix;
        revokedUserTry = "rev_try" + testSuffix;
        suspendedUser = "susp_u" + testSuffix;

        orgAlpha = organizationRepository.findByName("JoinCode Test Alpha University")
                .orElseGet(() -> organizationRepository.save(new Organization(
                        "JoinCode Test Alpha University",
                        OrganizationType.UNIVERSITY,
                        OrganizationStatus.ACTIVE,
                        "contact@alpha-univ.edu"
                )));

        orgBeta = organizationRepository.findByName("JoinCode Test Beta College")
                .orElseGet(() -> organizationRepository.save(new Organization(
                        "JoinCode Test Beta College",
                        OrganizationType.COLLEGE,
                        OrganizationStatus.ACTIVE,
                        "contact@beta-college.edu"
                )));

        orgSuspended = organizationRepository.findByName("JoinCode Test Suspended Institute")
                .orElseGet(() -> organizationRepository.save(new Organization(
                        "JoinCode Test Suspended Institute",
                        OrganizationType.COLLEGE,
                        OrganizationStatus.SUSPENDED,
                        "contact@suspended-inst.edu"
                )));

        if (userRepository.findByUsername("admin_alpha").isEmpty()) {
            userRepository.save(new User("admin_alpha", passwordEncoder.encode("pass123!A"), Role.ADMIN, orgAlpha));
        }
        if (userRepository.findByUsername("admin_beta").isEmpty()) {
            userRepository.save(new User("admin_beta", passwordEncoder.encode("pass123!A"), Role.ADMIN, orgBeta));
        }
        if (userRepository.findByUsername("student_alpha").isEmpty()) {
            userRepository.save(new User("student_alpha", passwordEncoder.encode("pass123!A"), Role.STUDENT, orgAlpha));
        }
    }

    @Test
    @Order(1)
    @WithMockUser(username = "admin_alpha", roles = {"ADMIN"})
    void adminCanCreateStudentJoinCode() throws Exception {
        CreateJoinCodeRequest request = new CreateJoinCodeRequest(
                Role.STUDENT,
                10,
                30,
                "ALPHA",
                null
        );

        MvcResult result = mockMvc.perform(post("/api/admin/join-codes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").exists())
                .andExpect(jsonPath("$.targetRole").value("STUDENT"))
                .andExpect(jsonPath("$.organizationName").value("JoinCode Test Alpha University"))
                .andExpect(jsonPath("$.maxUses").value(10))
                .andExpect(jsonPath("$.usedCount").value(0))
                .andExpect(jsonPath("$.valid").value(true))
                .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        studentJoinCodeAlpha = json.get("code").asText();
        studentJoinCodeAlphaId = json.get("id").asLong();

        assertThat(studentJoinCodeAlpha).startsWith("ALPHA-STU-");
    }

    @Test
    @Order(2)
    @WithMockUser(username = "admin_alpha", roles = {"ADMIN"})
    void adminCanCreateAdminJoinCode() throws Exception {
        CreateJoinCodeRequest request = new CreateJoinCodeRequest(
                Role.ADMIN,
                2,
                7,
                "ALPHA",
                null
        );

        MvcResult result = mockMvc.perform(post("/api/admin/join-codes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.targetRole").value("ADMIN"))
                .andExpect(jsonPath("$.organizationName").value("JoinCode Test Alpha University"))
                .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        adminJoinCodeAlpha = json.get("code").asText();
        assertThat(adminJoinCodeAlpha).startsWith("ALPHA-ADM-");
    }

    @Test
    @Order(3)
    @WithMockUser(username = "admin_alpha", roles = {"ADMIN"})
    void cannotCreateSuperAdminJoinCode() throws Exception {
        CreateJoinCodeRequest request = new CreateJoinCodeRequest(
                Role.SUPER_ADMIN,
                5,
                7,
                "ALPHA",
                null
        );

        mockMvc.perform(post("/api/admin/join-codes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
    }

    @Test
    @Order(4)
    @WithMockUser(username = "student_alpha", roles = {"STUDENT"})
    void studentCannotAccessJoinCodeAdminEndpoints() throws Exception {
        CreateJoinCodeRequest request = new CreateJoinCodeRequest(
                Role.STUDENT,
                5,
                7,
                "HACK",
                null
        );

        mockMvc.perform(post("/api/admin/join-codes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/join-codes"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(5)
    @WithMockUser(username = "admin_alpha", roles = {"ADMIN"})
    void adminCanListOrganizationJoinCodes() throws Exception {
        mockMvc.perform(get("/api/admin/join-codes").param("size", "500"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[?(@.code == '" + studentJoinCodeAlpha + "')]").exists());
    }

    @Test
    @Order(6)
    void publicCanValidateActiveJoinCode() throws Exception {
        mockMvc.perform(get("/api/auth/join-codes/" + studentJoinCodeAlpha + "/validate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.organizationName").value("JoinCode Test Alpha University"))
                .andExpect(jsonPath("$.targetRole").value("STUDENT"));
    }

    @Test
    @Order(7)
    void publicValidatingNonExistentJoinCodeReturnsInvalid() throws Exception {
        mockMvc.perform(get("/api/auth/join-codes/INVALID-CODE-9999/validate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(false))
                .andExpect(jsonPath("$.message").value("Join code does not exist"));
    }

    @Test
    @Order(8)
    void studentCanRegisterWithValidJoinCode() throws Exception {
        RegisterRequest request = new RegisterRequest(
                freshStudentUsername,
                "Password123!",
                studentJoinCodeAlpha
        );

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andReturn();

        Optional<User> createdOpt = userRepository.findByUsername(freshStudentUsername);
        assertThat(createdOpt).isPresent();
        User created = createdOpt.get();
        assertThat(created.getRole()).isEqualTo(Role.STUDENT);
        assertThat(created.getOrganization().getId()).isEqualTo(orgAlpha.getId());

        OrganizationJoinCode updatedCode = joinCodeRepository.findById(studentJoinCodeAlphaId).orElseThrow();
        assertThat(updatedCode.getUsedCount()).isEqualTo(1);
    }

    @Test
    @Order(9)
    void staffCanRegisterWithAdminJoinCode() throws Exception {
        RegisterRequest request = new RegisterRequest(
                freshInvestigatorUsername,
                "Password123!",
                adminJoinCodeAlpha
        );

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists());

        Optional<User> createdOpt = userRepository.findByUsername(freshInvestigatorUsername);
        assertThat(createdOpt).isPresent();
        User created = createdOpt.get();
        assertThat(created.getRole()).isEqualTo(Role.ADMIN);
        assertThat(created.getOrganization().getId()).isEqualTo(orgAlpha.getId());
    }

    @Test
    @Order(10)
    void registrationFailsWithDuplicateUsername() throws Exception {
        RegisterRequest request = new RegisterRequest(
                freshStudentUsername,
                "Password123!",
                studentJoinCodeAlpha
        );

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Username '" + freshStudentUsername + "' is already taken"));
    }

    @Test
    @Order(11)
    @WithMockUser(username = "admin_alpha", roles = {"ADMIN"})
    void joinCodeUsageLimitIsStrictlyEnforced() throws Exception {
        CreateJoinCodeRequest createReq = new CreateJoinCodeRequest(
                Role.STUDENT,
                1,
                30,
                "SINGLE",
                null
        );

        MvcResult result = mockMvc.perform(post("/api/admin/join-codes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isOk())
                .andReturn();

        singleUseJoinCode = objectMapper.readTree(result.getResponse().getContentAsString()).get("code").asText();

        // 1st registration succeeds
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RegisterRequest(singleUser1, "Password123!", singleUseJoinCode))))
                .andExpect(status().isOk());

        // 2nd registration fails because code is exhausted
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RegisterRequest(singleUser2, "Password123!", singleUseJoinCode))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Join code has reached its maximum usage limit"));
    }

    @Test
    @Order(12)
    @WithMockUser(username = "admin_alpha", roles = {"ADMIN"})
    void adminCanRevokeJoinCode() throws Exception {
        CreateJoinCodeRequest createReq = new CreateJoinCodeRequest(
                Role.STUDENT,
                10,
                30,
                "REVOKE",
                null
        );

        MvcResult result = mockMvc.perform(post("/api/admin/join-codes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        revokedJoinCode = json.get("code").asText();
        revokedJoinCodeId = json.get("id").asLong();

        // Revoke it
        mockMvc.perform(post("/api/admin/join-codes/" + revokedJoinCodeId + "/revoke"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.revoked").value(true))
                .andExpect(jsonPath("$.revokedBy").value("admin_alpha"));

        // Registration using revoked code should fail
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RegisterRequest(revokedUserTry, "Password123!", revokedJoinCode))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Join code has been revoked"));
    }

    @Test
    @Order(13)
    @WithMockUser(username = "admin_beta", roles = {"ADMIN"})
    void adminBetaCreatesJoinCode() throws Exception {
        CreateJoinCodeRequest createReq = new CreateJoinCodeRequest(
                Role.STUDENT,
                5,
                30,
                "BETA",
                null
        );

        MvcResult result = mockMvc.perform(post("/api/admin/join-codes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isOk())
                .andReturn();

        joinCodeBetaId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    @Test
    @Order(14)
    @WithMockUser(username = "admin_alpha", roles = {"ADMIN"})
    void adminAlphaCannotRevokeAdminBetaJoinCode() throws Exception {
        // Cross-tenant protection: Admin A trying to revoke Admin B's join code should yield 404 NOT_FOUND
        mockMvc.perform(post("/api/admin/join-codes/" + joinCodeBetaId + "/revoke"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    @Order(15)
    void registrationFailsIfOrganizationIsSuspended() throws Exception {
        String suspendedCodeValue = "SUSP-" + System.currentTimeMillis();
        OrganizationJoinCode suspendedCode = new OrganizationJoinCode(
                suspendedCodeValue,
                orgSuspended,
                Role.STUDENT,
                "system",
                10,
                null
        );
        joinCodeRepository.save(suspendedCode);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RegisterRequest(suspendedUser, "Password123!", suspendedCodeValue))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Organization is not active"));
    }

    @Test
    @Order(16)
    void registeredUserCanLoginAndVerifyProfile() throws Exception {
        LoginRequest loginReq = new LoginRequest(freshStudentUsername, "Password123!");

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andReturn();

        String jwt = objectMapper.readTree(loginResult.getResponse().getContentAsString()).get("token").asText();

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(freshStudentUsername))
                .andExpect(jsonPath("$.role").value("STUDENT"))
                .andExpect(jsonPath("$.organization.name").value("JoinCode Test Alpha University"));
    }
}
