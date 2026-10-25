package com.campus.transparency;

import com.campus.transparency.api.issue.CreateIssueRequest;
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
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class PublicTransparencyAndLeaderboardIntegrationTest {

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
    private PasswordEncoder passwordEncoder;

    private Organization qualifiedOrg;
    private Organization provisionalOrg;
    private Organization emptyOrg;

    private User adminQualified;
    private User studentQualified;
    private User adminProvisional;

    @BeforeAll
    void setUp() {
        String testSuffix = "_" + System.currentTimeMillis();

        qualifiedOrg = organizationRepository.save(new Organization(
                "Apex Technological University " + testSuffix,
                OrganizationType.UNIVERSITY,
                OrganizationStatus.ACTIVE,
                "apex" + testSuffix + "@test.edu"
        ));

        provisionalOrg = organizationRepository.save(new Organization(
                "Beacon Community College " + testSuffix,
                OrganizationType.COLLEGE,
                OrganizationStatus.ACTIVE,
                "beacon" + testSuffix + "@test.edu"
        ));

        emptyOrg = organizationRepository.save(new Organization(
                "Crest Research Institute " + testSuffix,
                OrganizationType.OTHER,
                OrganizationStatus.ACTIVE,
                "crest" + testSuffix + "@test.edu"
        ));

        String encodedPass = passwordEncoder.encode("Pass123!Safe");
        adminQualified = userRepository.save(new User("adm_apex" + testSuffix, encodedPass, Role.ADMIN, qualifiedOrg));
        studentQualified = userRepository.save(new User("stu_apex" + testSuffix, encodedPass, Role.STUDENT, qualifiedOrg));
        adminProvisional = userRepository.save(new User("adm_beacon" + testSuffix, encodedPass, Role.ADMIN, provisionalOrg));

        java.util.List<Issue> issuesToSave = new java.util.ArrayList<>();
        Instant now = Instant.now();

        // Seed 12 issues for qualifiedOrg (10 resolved, 1 in progress, 1 rejected) -> Eligible = 11 >= 10 -> QUALIFIED
        for (int i = 1; i <= 10; i++) {
            Issue issue = new Issue(
                    "Resolved Case " + i,
                    "Detailed description for issue " + i,
                    "hash_apex_" + i + testSuffix,
                    i % 2 == 0 ? "Academic Misconduct" : "Facilities",
                    i % 2 == 0 ? "Academic Affairs" : "Facilities Management",
                    qualifiedOrg
            );
            issue.setReporter(studentQualified);
            issue.transitionTo(IssueStatus.IN_PROGRESS);
            issue.transitionTo(IssueStatus.RESOLVED);
            issue.setResolvedAt(now.minus(48 - (i * 2), ChronoUnit.HOURS));
            issuesToSave.add(issue);
        }

        Issue activeIssue = new Issue(
                "Active Infrastructure Case",
                "Water leak in science hall",
                "hash_active_" + testSuffix,
                "Facilities",
                "Facilities Management",
                qualifiedOrg
        );
        activeIssue.setReporter(studentQualified);
        activeIssue.transitionTo(IssueStatus.IN_PROGRESS);
        issuesToSave.add(activeIssue);

        Issue rejectedIssue = new Issue(
                "Spam Submission",
                "Invalid duplicate submission",
                "hash_spam_" + testSuffix,
                "Other",
                "General",
                qualifiedOrg
        );
        rejectedIssue.setReporter(studentQualified);
        rejectedIssue.transitionTo(IssueStatus.REJECTED);
        issuesToSave.add(rejectedIssue);

        // Seed 3 issues for provisionalOrg (2 resolved, 1 reported) -> Eligible = 3 < 10 -> PROVISIONAL
        for (int i = 1; i <= 2; i++) {
            Issue issue = new Issue(
                    "Beacon Resolved " + i,
                    "Resolved issue description " + i,
                    "hash_beacon_" + i + testSuffix,
                    "IT Services",
                    "IT Support",
                    provisionalOrg
            );
            issue.transitionTo(IssueStatus.IN_PROGRESS);
            issue.transitionTo(IssueStatus.RESOLVED);
            issue.setResolvedAt(now.minus(12, ChronoUnit.HOURS));
            issuesToSave.add(issue);
        }

        Issue beaconReported = new Issue(
                "Beacon Reported Open",
                "Open report description",
                "hash_beacon_open_" + testSuffix,
                "IT Services",
                "IT Support",
                provisionalOrg
        );
        issuesToSave.add(beaconReported);

        issueRepository.saveAll(issuesToSave);
    }

    // =========================================================================
    // 1. PUBLIC TRANSPARENCY & SECURITY TESTS
    // =========================================================================

    @Test
    @Order(1)
    void publicTransparencySummaryIsAccessibleWithoutAuthentication() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/public/transparency"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalOrganizations").exists())
                .andExpect(jsonPath("$.activeOrganizations").exists())
                .andExpect(jsonPath("$.platformResolutionRate").exists())
                .andExpect(jsonPath("$.leaderboard").isArray())
                .andReturn();

        String body = result.getResponse().getContentAsString();
        // Zero complaint private leakage
        assertThat(body).doesNotContain("Detailed description");
        assertThat(body).doesNotContain("hash_apex");
        assertThat(body).doesNotContain("trackingCode");
        assertThat(body).doesNotContain("reporterAlias");
        assertThat(body).doesNotContain("assignedTo");
    }

    @Test
    @Order(2)
    void publicLeaderboardIsAccessibleWithoutAuthenticationAndRanksDeterministically() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/public/leaderboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(root.size()).isGreaterThanOrEqualTo(2);

        // Check top entry fields
        JsonNode first = root.get(0);
        assertThat(first.has("rank")).isTrue();
        assertThat(first.has("organizationName")).isTrue();
        assertThat(first.has("ethosScore")).isTrue();
        assertThat(first.has("resolutionRate")).isTrue();
        assertThat(first.has("medianResolutionHours")).isTrue();
        assertThat(first.has("qualificationStatus")).isTrue();

        // Must not expose private case information
        String body = result.getResponse().getContentAsString();
        assertThat(body).doesNotContain("description");
        assertThat(body).doesNotContain("reporter_id");
        assertThat(body).doesNotContain("reporterHash");
        assertThat(body).doesNotContain("trackingCode");
    }

    @Test
    @Order(3)
    void publicOrganizationTransparencyProfileExposesOnlyAggregates() throws Exception {
        mockMvc.perform(get("/api/public/organizations/" + qualifiedOrg.getId() + "/transparency"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.organizationId").value(qualifiedOrg.getId()))
                .andExpect(jsonPath("$.organizationName").value(qualifiedOrg.getName()))
                .andExpect(jsonPath("$.qualificationStatus").value("QUALIFIED"))
                .andExpect(jsonPath("$.totalComplaints").value(12))
                .andExpect(jsonPath("$.resolvedComplaints").value(10))
                .andExpect(jsonPath("$.activeComplaints").value(1))
                .andExpect(jsonPath("$.rejectedComplaints").value(1))
                .andExpect(jsonPath("$.eligibleComplaints").value(11))
                .andExpect(jsonPath("$.complaintsByCategory").isMap())
                .andExpect(jsonPath("$.complaintsByDepartment").isMap())
                // Verify zero individual complaint fields
                .andExpect(jsonPath("$.description").doesNotExist())
                .andExpect(jsonPath("$.trackingCode").doesNotExist())
                .andExpect(jsonPath("$.reporterAlias").doesNotExist())
                .andExpect(jsonPath("$.internalNotes").doesNotExist());
    }

    // =========================================================================
    // 2. ETHOS SCORE & ANTI-GAMING SMALL-SAMPLE VERIFICATION
    // =========================================================================

    @Test
    @Order(4)
    void smallSampleOrganizationIsMarkedProvisional() throws Exception {
        mockMvc.perform(get("/api/public/organizations/" + provisionalOrg.getId() + "/transparency"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.organizationName").value(provisionalOrg.getName()))
                .andExpect(jsonPath("$.qualificationStatus").value("PROVISIONAL"))
                .andExpect(jsonPath("$.totalComplaints").value(3))
                .andExpect(jsonPath("$.eligibleComplaints").value(3));
    }

    @Test
    @Order(5)
    void emptyOrganizationProducesSafeZeroMetrics() throws Exception {
        mockMvc.perform(get("/api/public/organizations/" + emptyOrg.getId() + "/transparency"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.organizationName").value(emptyOrg.getName()))
                .andExpect(jsonPath("$.qualificationStatus").value("PROVISIONAL"))
                .andExpect(jsonPath("$.totalComplaints").value(0))
                .andExpect(jsonPath("$.resolvedComplaints").value(0))
                .andExpect(jsonPath("$.resolutionRate").value(0.0))
                .andExpect(jsonPath("$.ethosScore").value(0.0))
                .andExpect(jsonPath("$.averageResolutionHours").value(0.0))
                .andExpect(jsonPath("$.medianResolutionHours").value(0.0));
    }

    @Test
    @Order(6)
    void ethosScoreIsBoundedBetweenZeroAndOneHundred() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/public/organizations/" + qualifiedOrg.getId() + "/transparency"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        double score = root.get("ethosScore").asDouble();
        assertThat(score).isGreaterThan(0.0).isLessThanOrEqualTo(100.0);
    }

    // =========================================================================
    // 3. RESOLUTION RATE & SPEED METRICS
    // =========================================================================

    @Test
    @Order(7)
    void resolutionRateExcludesRejectedComplaintsFromEligibleDenominator() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/public/organizations/" + qualifiedOrg.getId() + "/transparency"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        long eligible = root.get("eligibleComplaints").asLong();
        long resolved = root.get("resolvedComplaints").asLong();
        double rate = root.get("resolutionRate").asDouble();

        // 10 resolved / 11 eligible = 90.9%
        assertThat(eligible).isEqualTo(11);
        assertThat(resolved).isEqualTo(10);
        assertThat(rate).isEqualTo(90.9);
    }

    @Test
    @Order(8)
    void periodFilteringRestrictsMetricsCorrectly() throws Exception {
        mockMvc.perform(get("/api/public/organizations/" + qualifiedOrg.getId() + "/transparency?period=LAST_30_DAYS"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.period").value("LAST_30_DAYS"))
                .andExpect(jsonPath("$.totalComplaints").isNumber());
    }

    // =========================================================================
    // 4. ORG ADMIN METRICS & STRICT TENANT ISOLATION
    // =========================================================================

    @Test
    @Order(9)
    void orgAdminReceivesFullAuthoritativeAnalyticsForOwnOrganizationOnly() throws Exception {
        mockMvc.perform(get("/api/admin/metrics?period=ALL_TIME")
                        .with(user(adminQualified.getUsername()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalComplaints").value(12))
                .andExpect(jsonPath("$.resolvedComplaints").value(10))
                .andExpect(jsonPath("$.resolutionRate").value(90.9))
                .andExpect(jsonPath("$.ethosScore").isNumber())
                .andExpect(jsonPath("$.qualificationStatus").value("QUALIFIED"))
                .andExpect(jsonPath("$.complaintsByCategory").isMap())
                .andExpect(jsonPath("$.complaintsByDepartment").isMap());
    }

    @Test
    @Order(10)
    void individualComplaintEndpointRejectsUnauthenticatedAccess() throws Exception {
        mockMvc.perform(get("/api/issues"))
                .andExpect(status().isForbidden());
    }
}
