package com.campus.transparency;

import com.campus.transparency.api.issue.CreateIssueRequest;
import com.campus.transparency.application.issue.AnonymousTagService;
import com.campus.transparency.domain.issue.Issue;
import com.campus.transparency.domain.issue.IssueRepository;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.campus.transparency.testconfig.IsolatedTestDatabase;

@SpringBootTest
@AutoConfigureMockMvc
@IsolatedTestDatabase
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class ComplaintPseudonymIntegrationTest {

    static {
        com.campus.transparency.config.DotenvLoader.load();
    }

    private static final Pattern COMPLAINANT_PATTERN = Pattern.compile("^Complainant #[0-9A-F]{4}$");

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
    private User testStudentA;
    private User testAdminA;
    private User testAdminB;

    @BeforeEach
    void setUp() {
        String runSuffix = String.valueOf(System.currentTimeMillis() % 100000);
        testOrgA = organizationRepository.save(new Organization(
                "Pseudonym Test College A " + runSuffix,
                OrganizationType.COLLEGE,
                OrganizationStatus.ACTIVE,
                "contactA" + runSuffix + "@pseudo.edu"
        ));

        testOrgB = organizationRepository.save(new Organization(
                "Pseudonym Test College B " + runSuffix,
                OrganizationType.COLLEGE,
                OrganizationStatus.ACTIVE,
                "contactB" + runSuffix + "@pseudo.edu"
        ));

        testStudentA = userRepository.save(new User(
                "pseudo_student_a_" + runSuffix,
                "$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi",
                Role.STUDENT,
                testOrgA
        ));

        testAdminA = userRepository.save(new User(
                "pseudo_admin_a_" + runSuffix,
                "$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi",
                Role.ADMIN,
                testOrgA
        ));

        testAdminB = userRepository.save(new User(
                "pseudo_admin_b_" + runSuffix,
                "$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi",
                Role.ADMIN,
                testOrgB
        ));
    }

    @Test
    @Order(1)
    @DisplayName("1. New issue creation generates a complaint-specific pseudonym matching 'Complainant #XXXX'")
    void test1_newIssueReceivesComplaintSpecificPseudonym() throws Exception {
        CreateIssueRequest request = new CreateIssueRequest(
                "Library AC Not Working",
                "Temperature in quiet study room is 32C",
                null,
                "Infrastructure",
                "Facilities"
        );

        MvcResult result = mockMvc.perform(post("/api/issues")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(testStudentA.getUsername()).roles("STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.reporterAlias").exists())
                .andExpect(jsonPath("$.trackingCode").exists())
                .andExpect(jsonPath("$.reporterHash").doesNotExist())
                .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        String alias = json.get("reporterAlias").asText();
        assertThat(alias).matches(COMPLAINANT_PATTERN);
    }

    @Test
    @Order(2)
    @DisplayName("2. Multiple complaints from the same student receive distinct, uncorrelated pseudonyms")
    void test2_multipleIssuesFromSameStudentReceiveUncorrelatedPseudonyms() throws Exception {
        CreateIssueRequest req1 = new CreateIssueRequest(
                "Water Dispenser Leaking",
                "First floor dispenser leaking all over hallway",
                null,
                "Maintenance",
                "Facilities"
        );
        CreateIssueRequest req2 = new CreateIssueRequest(
                "Broken Chair in Lab 204",
                "Hydraulic mechanism failed on chair 12",
                null,
                "Equipment",
                "IT Services"
        );

        MvcResult res1 = mockMvc.perform(post("/api/issues")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(testStudentA.getUsername()).roles("STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isCreated())
                .andReturn();

        MvcResult res2 = mockMvc.perform(post("/api/issues")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(testStudentA.getUsername()).roles("STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req2)))
                .andExpect(status().isCreated())
                .andReturn();

        String alias1 = objectMapper.readTree(res1.getResponse().getContentAsString()).get("reporterAlias").asText();
        String alias2 = objectMapper.readTree(res2.getResponse().getContentAsString()).get("reporterAlias").asText();

        Long id1 = objectMapper.readTree(res1.getResponse().getContentAsString()).get("id").asLong();
        Long id2 = objectMapper.readTree(res2.getResponse().getContentAsString()).get("id").asLong();

        assertThat(alias1).matches(COMPLAINANT_PATTERN);
        assertThat(alias2).matches(COMPLAINANT_PATTERN);
        // Guarantee uncorrelated identity
        assertThat(alias1).isNotEqualTo(alias2);

        // Verify internal database entities also isolate internal reporter hash
        Issue issue1 = issueRepository.findById(id1).orElseThrow();
        Issue issue2 = issueRepository.findById(id2).orElseThrow();
        assertThat(issue1.getReporterHash()).isNotEqualTo(issue2.getReporterHash());
    }

    @Test
    @Order(3)
    @DisplayName("3. Even if legacy client supplies identical reporterHash, server generates uncorrelated aliases and isolated hashes")
    void test3_sameClientReporterHashDoesNotCorrelateIssues() throws Exception {
        String fixedClientHash = "attacker_tracking_hash_12345";
        CreateIssueRequest req1 = new CreateIssueRequest(
                "Issue Alpha",
                "Alpha description",
                fixedClientHash,
                "Safety",
                "Campus Security"
        );
        CreateIssueRequest req2 = new CreateIssueRequest(
                "Issue Beta",
                "Beta description",
                fixedClientHash,
                "Safety",
                "Campus Security"
        );

        MvcResult res1 = mockMvc.perform(post("/api/issues")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(testStudentA.getUsername()).roles("STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isCreated())
                .andReturn();

        MvcResult res2 = mockMvc.perform(post("/api/issues")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(testStudentA.getUsername()).roles("STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req2)))
                .andExpect(status().isCreated())
                .andReturn();

        String alias1 = objectMapper.readTree(res1.getResponse().getContentAsString()).get("reporterAlias").asText();
        String alias2 = objectMapper.readTree(res2.getResponse().getContentAsString()).get("reporterAlias").asText();

        assertThat(alias1).matches(COMPLAINANT_PATTERN);
        assertThat(alias2).matches(COMPLAINANT_PATTERN);
        assertThat(alias1).isNotEqualTo(alias2);
    }

    @Test
    @Order(4)
    @DisplayName("4. Authenticated feed exposes reporterAlias; Public tracking strictly omits it")
    void test4_authenticatedFeedExposesAliasWhilePublicTrackingOmitsIt() throws Exception {
        CreateIssueRequest request = new CreateIssueRequest(
                "Broken Projector in Hall B",
                "Lamp burned out during lecture",
                null,
                "AV Equipment",
                "IT Services"
        );

        MvcResult createResult = mockMvc.perform(post("/api/issues")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(testStudentA.getUsername()).roles("STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode createdJson = objectMapper.readTree(createResult.getResponse().getContentAsString());
        Long issueId = createdJson.get("id").asLong();
        String expectedAlias = createdJson.get("reporterAlias").asText();
        String trackingCode = createdJson.get("trackingCode").asText();

        // Check student authenticated feed
        mockMvc.perform(get("/api/issues/{id}", issueId)
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(testStudentA.getUsername()).roles("STUDENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reporterAlias").value(expectedAlias))
                .andExpect(jsonPath("$.reporterHash").doesNotExist());

        // Check admin authenticated feed
        mockMvc.perform(get("/api/issues/{id}", issueId)
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(testAdminA.getUsername()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reporterAlias").value(expectedAlias))
                .andExpect(jsonPath("$.reporterHash").doesNotExist());

        // Check public tracking: MUST NOT expose reporterAlias, reporterHash, or internal details
        mockMvc.perform(get("/api/issues/track/{trackingCode}", trackingCode))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trackingCode").value(trackingCode))
                .andExpect(jsonPath("$.reporterAlias").doesNotExist())
                .andExpect(jsonPath("$.reporterHash").doesNotExist())
                .andExpect(jsonPath("$.assignedTo").doesNotExist());
    }

    @Test
    @Order(5)
    @DisplayName("5. Aliases contain no user identifier, username, email, or database ID")
    void test5_aliasesContainNoAccountIdentifier() throws Exception {
        CreateIssueRequest request = new CreateIssueRequest(
                "Elevator 3 Out of Service",
                "Buttons do not register floor selection",
                null,
                "Infrastructure",
                "Facilities"
        );

        MvcResult result = mockMvc.perform(post("/api/issues")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(testStudentA.getUsername()).roles("STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String alias = objectMapper.readTree(result.getResponse().getContentAsString()).get("reporterAlias").asText();
        assertThat(alias).doesNotContain(testStudentA.getUsername());
        assertThat(alias).doesNotContain(String.valueOf(testStudentA.getId()));
        assertThat(alias).doesNotContain("pseudo");
        assertThat(alias).matches(COMPLAINANT_PATTERN);
    }

    @Test
    @Order(6)
    @DisplayName("6. Client cannot select or override the complaint alias in the payload")
    void test6_clientCannotSelectOrOverrideAlias() throws Exception {
        Map<String, Object> maliciousPayload = Map.of(
                "title", "Spoofed Alias Test",
                "description", "Attempting to force custom alias",
                "reporterAlias", "Complainant #HACK",
                "category", "Security",
                "department", "IT Services"
        );

        MvcResult result = mockMvc.perform(post("/api/issues")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(testStudentA.getUsername()).roles("STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(maliciousPayload)))
                .andExpect(status().isCreated())
                .andReturn();

        String alias = objectMapper.readTree(result.getResponse().getContentAsString()).get("reporterAlias").asText();
        assertThat(alias).isNotEqualTo("Complainant #HACK");
        assertThat(alias).matches(COMPLAINANT_PATTERN);
    }

    @Test
    @Order(7)
    @DisplayName("7. Public issue feed requires authentication (complaints are NOT publicly browsable)")
    void test7_publicFeedRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/issues"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(8)
    @DisplayName("8. Tracking endpoint exposes only safe tracking information and prevents data leakage")
    void test8_trackingEndpointExposesOnlySafeTrackingInformation() throws Exception {
        CreateIssueRequest request = new CreateIssueRequest(
                "Heating Failure in Dormitory",
                "No heat in Room 302",
                null,
                "HVAC",
                "Facilities"
        );

        MvcResult result = mockMvc.perform(post("/api/issues")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(testStudentA.getUsername()).roles("STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode created = objectMapper.readTree(result.getResponse().getContentAsString());
        String trackingCode = created.get("trackingCode").asText();

        // Query tracking endpoint unauthenticated
        MvcResult trackResult = mockMvc.perform(get("/api/issues/track/{trackingCode}", trackingCode))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode trackJson = objectMapper.readTree(trackResult.getResponse().getContentAsString());

        // Verify safe fields ARE present
        assertThat(trackJson.get("trackingCode").asText()).isEqualTo(trackingCode);
        assertThat(trackJson.get("title").asText()).isEqualTo("Heating Failure in Dormitory");
        assertThat(trackJson.get("description").asText()).isEqualTo("No heat in Room 302");
        assertThat(trackJson.get("status").asText()).isEqualTo("REPORTED");

        // Verify sensitive fields are strictly ABSENT
        assertThat(trackJson.has("reporterAlias")).isFalse();
        assertThat(trackJson.has("reporterHash")).isFalse();
        assertThat(trackJson.has("assignedTo")).isFalse();
        assertThat(trackJson.has("organization")).isFalse();
        assertThat(trackJson.has("internalNotes")).isFalse();
        assertThat(trackJson.has("messages")).isFalse();
        assertThat(trackJson.has("auditLogs")).isFalse();
    }

    @Test
    @Order(9)
    @DisplayName("9. Cross-tenant issue access remains strictly denied (returns 404)")
    void test9_crossTenantIssueAccessDenied() throws Exception {
        CreateIssueRequest request = new CreateIssueRequest(
                "Org A Confidential Signal",
                "Internal lab safety issue",
                null,
                "Safety",
                "Facilities"
        );

        MvcResult result = mockMvc.perform(post("/api/issues")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(testStudentA.getUsername()).roles("STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        Long orgAIssueId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        // Org B Admin attempts to access Org A issue -> returns 404 NOT_FOUND (anti-enumeration)
        mockMvc.perform(get("/api/issues/{id}", orgAIssueId)
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(testAdminB.getUsername()).roles("ADMIN")))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(10)
    @DisplayName("10. AnonymousTagService contract generates high-entropy 'Complainant #XXXX' pseudonyms")
    void test10_anonymousTagServiceEntropy() {
        Set<String> generated = new HashSet<>();
        for (int i = 0; i < 100; i++) {
            String pseudonym = AnonymousTagService.generateComplaintPseudonym();
            assertThat(pseudonym).matches(COMPLAINANT_PATTERN);
            generated.add(pseudonym);
        }
        assertThat(generated.size()).isGreaterThanOrEqualTo(95);
    }
}
