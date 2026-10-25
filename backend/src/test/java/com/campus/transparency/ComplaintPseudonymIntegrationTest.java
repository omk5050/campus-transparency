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
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.HashSet;
import java.util.Set;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
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

    private Organization testOrg;
    private User testStudent;
    private User testAdmin;

    @BeforeEach
    void setUp() {
        String runSuffix = String.valueOf(System.currentTimeMillis() % 100000);
        testOrg = organizationRepository.save(new Organization(
                "Pseudonym Test College " + runSuffix,
                OrganizationType.COLLEGE,
                OrganizationStatus.ACTIVE,
                "contact" + runSuffix + "@pseudo.edu"
        ));

        testStudent = userRepository.save(new User(
                "pseudo_student_" + runSuffix,
                "$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi",
                Role.STUDENT,
                testOrg
        ));

        testAdmin = userRepository.save(new User(
                "pseudo_admin_" + runSuffix,
                "$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi",
                Role.ADMIN,
                testOrg
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
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(testStudent.getUsername()).roles("STUDENT"))
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
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(testStudent.getUsername()).roles("STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isCreated())
                .andReturn();

        MvcResult res2 = mockMvc.perform(post("/api/issues")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(testStudent.getUsername()).roles("STUDENT"))
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
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(testStudent.getUsername()).roles("STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isCreated())
                .andReturn();

        MvcResult res2 = mockMvc.perform(post("/api/issues")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(testStudent.getUsername()).roles("STUDENT"))
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
    @DisplayName("4. Public feed and Admin feed consistently expose the complaint-specific pseudonym without leakage")
    void test4_publicFeedAndAdminFeedExposeConsistentReporterAlias() throws Exception {
        CreateIssueRequest request = new CreateIssueRequest(
                "Broken Projector in Hall B",
                "Lamp burned out during lecture",
                null,
                "AV Equipment",
                "IT Services"
        );

        MvcResult createResult = mockMvc.perform(post("/api/issues")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(testStudent.getUsername()).roles("STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode createdJson = objectMapper.readTree(createResult.getResponse().getContentAsString());
        Long issueId = createdJson.get("id").asLong();
        String expectedAlias = createdJson.get("reporterAlias").asText();
        String trackingCode = createdJson.get("trackingCode").asText();

        // Check student public feed
        mockMvc.perform(get("/api/issues/{id}", issueId)
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(testStudent.getUsername()).roles("STUDENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reporterAlias").value(expectedAlias))
                .andExpect(jsonPath("$.reporterHash").doesNotExist());

        // Check admin feed
        mockMvc.perform(get("/api/issues/{id}", issueId)
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(testAdmin.getUsername()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reporterAlias").value(expectedAlias))
                .andExpect(jsonPath("$.reporterHash").doesNotExist());

        // Check public tracking
        mockMvc.perform(get("/api/issues/track/{trackingCode}", trackingCode))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reporterAlias").value(expectedAlias))
                .andExpect(jsonPath("$.reporterHash").doesNotExist());
    }

    @Test
    @Order(5)
    @DisplayName("5. AnonymousTagService contract generates high-entropy 'Complainant #XXXX' pseudonyms")
    void test5_anonymousTagServiceEntropy() {
        Set<String> generated = new HashSet<>();
        for (int i = 0; i < 100; i++) {
            String pseudonym = AnonymousTagService.generateComplaintPseudonym();
            assertThat(pseudonym).matches(COMPLAINANT_PATTERN);
            generated.add(pseudonym);
        }
        // With 65,536 combinations, 100 samples should have > 95 unique values
        assertThat(generated.size()).isGreaterThanOrEqualTo(95);
    }
}
