package com.campus.transparency;

import com.campus.transparency.api.forum.CreateForumPostRequest;
import com.campus.transparency.api.forum.CreateForumReplyRequest;
import com.campus.transparency.api.forum.ModerateForumRequest;
import com.campus.transparency.api.forum.UpdateForumPostRequest;
import com.campus.transparency.application.forum.ForumRateLimiter;
import com.campus.transparency.domain.forum.*;
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

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.campus.transparency.testconfig.IsolatedTestDatabase;

@SpringBootTest
@AutoConfigureMockMvc
@IsolatedTestDatabase
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class ForumIntegrationTest {

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
    private ForumPostRepository forumPostRepository;

    @Autowired
    private ForumReplyRepository forumReplyRepository;

    @Autowired
    private ForumAuditLogRepository forumAuditLogRepository;

    @Autowired
    private IssueRepository issueRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ForumRateLimiter forumRateLimiter;

    private Organization orgA;
    private Organization orgB;

    private User studentA;
    private User adminA;
    private User studentB;
    private User adminB;
    private User superAdmin;

    private Long createdPostId;
    private Issue testComplaint;

    @BeforeAll
    void setUp() {
        String testSuffix = "_" + System.currentTimeMillis();

        orgA = organizationRepository.save(new Organization(
                "Athena Polytechnic " + testSuffix,
                OrganizationType.COLLEGE,
                OrganizationStatus.ACTIVE,
                "athena" + testSuffix + "@test.edu"
        ));

        orgB = organizationRepository.save(new Organization(
                "Babylon Institute " + testSuffix,
                OrganizationType.UNIVERSITY,
                OrganizationStatus.ACTIVE,
                "babylon" + testSuffix + "@test.edu"
        ));

        String encodedPass = passwordEncoder.encode("Pass123!Safe");
        studentA = userRepository.save(new User("stu_a" + testSuffix, encodedPass, Role.STUDENT, orgA));
        adminA = userRepository.save(new User("adm_a" + testSuffix, encodedPass, Role.ADMIN, orgA));
        studentB = userRepository.save(new User("stu_b" + testSuffix, encodedPass, Role.STUDENT, orgB));
        adminB = userRepository.save(new User("adm_b" + testSuffix, encodedPass, Role.ADMIN, orgB));
        superAdmin = userRepository.save(new User("super" + testSuffix, encodedPass, Role.SUPER_ADMIN, null));

        // Create a distinct private complaint to verify total separation
        testComplaint = new Issue(
                "Hostel Tap Leaking Private Complaint",
                "Water leak description that must NEVER appear in forum",
                "hash_p4_test_" + testSuffix,
                "Facilities",
                "Facilities Management",
                orgA
        );
        testComplaint.setReporter(studentA);
        testComplaint = issueRepository.save(testComplaint);
    }

    @BeforeEach
    void resetRateLimits() {
        forumRateLimiter.reset();
    }

    // =========================================================================
    // 1. FORUM CREATION TESTS (Requirements 1-6)
    // =========================================================================

    @Test
    @Order(1)
    void superAdminCanCreateForumPostForOrganization() throws Exception {
        CreateForumPostRequest req = new CreateForumPostRequest(
                "Improve library weekend hours",
                "Could the library stay open until 10 PM on Sundays?",
                "SUGGESTION",
                orgA.getId()
        );

        MvcResult result = mockMvc.perform(post("/api/forum/posts")
                        .with(user(superAdmin.getUsername()).roles("SUPER_ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.title").value("Improve library weekend hours"))
                .andExpect(jsonPath("$.category").value("SUGGESTION"))
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.organizationId").value(orgA.getId()))
                .andExpect(jsonPath("$.organizationName").value(orgA.getName()))
                .andExpect(jsonPath("$.authorAlias").value(org.hamcrest.Matchers.startsWith("Member #")))
                .andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        createdPostId = root.get("id").asLong();
    }

    @Test
    @Order(2)
    void nonSuperAdminRolesAreForbiddenFromCreatingForumPosts() throws Exception {
        CreateForumPostRequest req = new CreateForumPostRequest(
                "Non-super user trying to post",
                "This should be 403 Forbidden",
                "GENERAL"
        );

        // STUDENT -> 403
        mockMvc.perform(post("/api/forum/posts")
                        .with(user(studentA.getUsername()).roles("STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());

        // ADMIN -> 403
        mockMvc.perform(post("/api/forum/posts")
                        .with(user(adminA.getUsername()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());

        // INVESTIGATOR -> 403
        mockMvc.perform(post("/api/forum/posts")
                        .with(user("test_inv").roles("INVESTIGATOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(3)
    void invalidCategoryIsRejectedWithBadRequest() throws Exception {
        String invalidPayload = """
            {
                "title": "Invalid Category Test",
                "content": "Some valid content",
                "category": "TOTALLY_INVALID_CATEGORY_NAME",
                "organizationId": %d
            }
        """.formatted(orgA.getId());

        mockMvc.perform(post("/api/forum/posts")
                        .with(user(superAdmin.getUsername()).roles("SUPER_ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidPayload))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(4)
    void blankTitleIsRejectedWithBadRequest() throws Exception {
        CreateForumPostRequest req = new CreateForumPostRequest("   ", "Valid content", "GENERAL", orgA.getId());

        mockMvc.perform(post("/api/forum/posts")
                        .with(user(superAdmin.getUsername()).roles("SUPER_ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(5)
    void blankContentIsRejectedWithBadRequest() throws Exception {
        CreateForumPostRequest req = new CreateForumPostRequest("Valid Title", "   ", "GENERAL", orgA.getId());

        mockMvc.perform(post("/api/forum/posts")
                        .with(user(superAdmin.getUsername()).roles("SUPER_ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    // =========================================================================
    // 2. REPLIES & TENANT VERIFICATION (Requirements 7-10)
    // =========================================================================

    @Test
    @Order(6)
    void userCanReplyToPostInSameOrganization() throws Exception {
        CreateForumReplyRequest req = new CreateForumReplyRequest("I totally agree, late hours are needed!");

        mockMvc.perform(post("/api/forum/posts/" + createdPostId + "/replies")
                        .with(user(adminA.getUsername()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.postId").value(createdPostId))
                .andExpect(jsonPath("$.content").value("I totally agree, late hours are needed!"))
                .andExpect(jsonPath("$.authorAlias").value(org.hamcrest.Matchers.startsWith("Member #")));
    }

    @Test
    @Order(7)
    void crossOrganizationReplyIsRejected() throws Exception {
        // studentB belongs to orgB, createdPostId belongs to orgA
        CreateForumReplyRequest req = new CreateForumReplyRequest("Cross org unauthorized reply");

        mockMvc.perform(post("/api/forum/posts/" + createdPostId + "/replies")
                        .with(user(studentB.getUsername()).roles("STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // 3. PUBLIC USER PRIVACY (Requirements 11-17)
    // =========================================================================

    @Test
    @Order(8)
    void publicForumResponsesContainZeroPrivateUserDataOrComplaintData() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/public/forum/" + createdPostId))
                .andExpect(status().isOk())
                .andReturn();

        String body = result.getResponse().getContentAsString();
        // Safe alias must exist
        assertThat(body).contains("Member #");
        assertThat(body).contains("Improve library weekend hours");

        // Zero personal/account information leakage
        assertThat(body).doesNotContain(studentA.getUsername());
        assertThat(body).doesNotContain("password");
        assertThat(body).doesNotContain("author_id");
        assertThat(body).doesNotContain("reporter_id");
        assertThat(body).doesNotContain("reporterHash");
        assertThat(body).doesNotContain("trackingCode");
        assertThat(body).doesNotContain("Complainant #"); // Must never reuse complaint pseudonym format
        assertThat(body).doesNotContain("Hostel Tap Leaking Private Complaint");
        assertThat(body).doesNotContain("Water leak description that must NEVER appear in forum");
    }

    @Test
    @Order(9)
    void publicRepliesContainZeroPrivateUserDataOrComplaintData() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/public/forum/" + createdPostId + "/replies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andReturn();

        String body = result.getResponse().getContentAsString();
        assertThat(body).contains("Member #");
        assertThat(body).doesNotContain(adminA.getUsername());
        assertThat(body).doesNotContain("email");
        assertThat(body).doesNotContain("trackingCode");
        assertThat(body).doesNotContain("Complainant #");
    }

    // =========================================================================
    // 4. TENANT ISOLATION (Requirements 18-22)
    // =========================================================================

    @Test
    @Order(10)
    void orgACannotEditOrgBForumPost() throws Exception {
        // Create post for Org B
        ForumPost postB = forumPostRepository.save(new ForumPost(
                orgB,
                studentB,
                "Member #BB01",
                "Babylon Shuttle Bus",
                "Bus schedule discussion",
                ForumPostCategory.FEEDBACK,
                ForumPostStatus.PUBLISHED
        ));

        UpdateForumPostRequest updateReq = new UpdateForumPostRequest(
                "Hacked Bus Title",
                "Hacked Bus Content",
                "FEEDBACK"
        );

        mockMvc.perform(put("/api/forum/posts/" + postB.getId())
                        .with(user(studentA.getUsername()).roles("STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(11)
    void orgAAdminCannotModerateOrgBPost() throws Exception {
        ForumPost postB = forumPostRepository.save(new ForumPost(
                orgB,
                studentB,
                "Member #BB02",
                "Babylon Cafeteria",
                "Food quality discussion",
                ForumPostCategory.DISCUSSION,
                ForumPostStatus.PUBLISHED
        ));

        ModerateForumRequest modReq = new ModerateForumRequest("Spam");

        // adminA belongs to orgA -> prohibited from moderating orgB
        mockMvc.perform(post("/api/admin/forum/posts/" + postB.getId() + "/hide")
                        .with(user(adminA.getUsername()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(modReq)))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(12)
    void superAdminCanModeratePostsAcrossAllOrganizations() throws Exception {
        ForumPost postB = forumPostRepository.save(new ForumPost(
                orgB,
                studentB,
                "Member #BB03",
                "Babylon Exam Schedule",
                "Exam schedule discussion",
                ForumPostCategory.QUESTION,
                ForumPostStatus.PUBLISHED
        ));

        ModerateForumRequest modReq = new ModerateForumRequest("Super Admin review");

        mockMvc.perform(post("/api/super-admin/forum/posts/" + postB.getId() + "/lock")
                        .with(user(superAdmin.getUsername()).roles("SUPER_ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(modReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("LOCKED"));
    }

    // =========================================================================
    // 5. MODERATION WORKFLOW (Requirements 23-30)
    // =========================================================================

    @Test
    @Order(13)
    void orgAdminCanLockPostAndLockedPostRejectsRepliesWhileRemainingReadable() throws Exception {
        ModerateForumRequest lockReq = new ModerateForumRequest("Discussion concluded");

        // Lock post
        mockMvc.perform(post("/api/admin/forum/posts/" + createdPostId + "/lock")
                        .with(user(adminA.getUsername()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(lockReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("LOCKED"))
                .andExpect(jsonPath("$.isLocked").value(true));

        // Locked post remains readable on public API
        mockMvc.perform(get("/api/public/forum/" + createdPostId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isLocked").value(true));

        // Locked post rejects replies
        CreateForumReplyRequest replyReq = new CreateForumReplyRequest("Attempt reply to locked post");
        mockMvc.perform(post("/api/forum/posts/" + createdPostId + "/replies")
                        .with(user(studentA.getUsername()).roles("STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(replyReq)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(14)
    void orgAdminCanUnlockPostAndPostAcceptsRepliesAgain() throws Exception {
        // Unlock
        mockMvc.perform(post("/api/admin/forum/posts/" + createdPostId + "/unlock")
                        .with(user(adminA.getUsername()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.isLocked").value(false));

        // Now reply succeeds
        CreateForumReplyRequest replyReq = new CreateForumReplyRequest("Discussion reopened reply");
        mockMvc.perform(post("/api/forum/posts/" + createdPostId + "/replies")
                        .with(user(studentA.getUsername()).roles("STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(replyReq)))
                .andExpect(status().isCreated());
    }

    @Test
    @Order(15)
    void hiddenPostDisappearsFromPublicApi() throws Exception {
        ModerateForumRequest hideReq = new ModerateForumRequest("Inappropriate content");

        mockMvc.perform(post("/api/admin/forum/posts/" + createdPostId + "/hide")
                        .with(user(adminA.getUsername()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(hideReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("HIDDEN"));

        // Must now return 404 on public API
        mockMvc.perform(get("/api/public/forum/" + createdPostId))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(16)
    void deletedPostDisappearsFromPublicApi() throws Exception {
        // Create a new post to delete
        ForumPost postToDelete = forumPostRepository.save(new ForumPost(
                orgA,
                studentA,
                "Member #DE01",
                "Post to delete",
                "Content to delete",
                ForumPostCategory.GENERAL,
                ForumPostStatus.PUBLISHED
        ));

        mockMvc.perform(delete("/api/forum/posts/" + postToDelete.getId())
                        .with(user(studentA.getUsername()).roles("STUDENT")))
                .andExpect(status().isNoContent());

        // Must return 404 on public API
        mockMvc.perform(get("/api/public/forum/" + postToDelete.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(17)
    void moderationActionsRecordForumAuditLogs() throws Exception {
        mockMvc.perform(get("/api/admin/forum/audit-logs")
                        .with(user(adminA.getUsername()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].action").exists())
                .andExpect(jsonPath("$.content[0].actor").exists());
    }

    // =========================================================================
    // 6. RATE LIMITING (Requirements 31-32)
    // =========================================================================

    @Test
    @Order(18)
    void excessivePostCreationIsBlockedWithTooManyRequests() throws Exception {
        String rateLimitUser = "super_rate_" + System.currentTimeMillis();
        User rateUser = userRepository.save(new User(rateLimitUser, passwordEncoder.encode("Pass123!"), Role.SUPER_ADMIN, null));

        // Capacity is 5 posts per hour
        for (int i = 1; i <= 5; i++) {
            CreateForumPostRequest req = new CreateForumPostRequest("Post " + i, "Content " + i, "GENERAL", orgA.getId());
            mockMvc.perform(post("/api/forum/posts")
                            .with(user(rateUser.getUsername()).roles("SUPER_ADMIN"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isCreated());
        }

        // 6th post must fail with 429
        CreateForumPostRequest excessReq = new CreateForumPostRequest("Excess Post 6", "Excess content", "GENERAL", orgA.getId());
        mockMvc.perform(post("/api/forum/posts")
                        .with(user(rateUser.getUsername()).roles("SUPER_ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(excessReq)))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    @Order(19)
    void excessiveReplyCreationIsBlockedWithTooManyRequests() throws Exception {
        String rateLimitUser = "stu_reply_rate_" + System.currentTimeMillis();
        User rateUser = userRepository.save(new User(rateLimitUser, passwordEncoder.encode("Pass123!"), Role.STUDENT, orgA));

        ForumPost targetPost = forumPostRepository.save(new ForumPost(
                orgA,
                studentA,
                "Member #RT01",
                "Rate Limit Reply Target",
                "Discussion content",
                ForumPostCategory.GENERAL,
                ForumPostStatus.PUBLISHED
        ));

        // Capacity is 20 replies per hour
        for (int i = 1; i <= 20; i++) {
            CreateForumReplyRequest req = new CreateForumReplyRequest("Reply " + i);
            mockMvc.perform(post("/api/forum/posts/" + targetPost.getId() + "/replies")
                            .with(user(rateUser.getUsername()).roles("STUDENT"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isCreated());
        }

        // 21st reply must fail with 429
        CreateForumReplyRequest excessReq = new CreateForumReplyRequest("Excess Reply 21");
        mockMvc.perform(post("/api/forum/posts/" + targetPost.getId() + "/replies")
                        .with(user(rateUser.getUsername()).roles("STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(excessReq)))
                .andExpect(status().isTooManyRequests());
    }

    // =========================================================================
    // 7. COMPLAINT VS FORUM SAFETY BOUNDARY (Requirements 33-35)
    // =========================================================================

    @Test
    @Order(20)
    void forumPostDoesNotAppearInComplaintApis() throws Exception {
        // Create forum post
        CreateForumPostRequest req = new CreateForumPostRequest(
                "Hostel Serious Water Problem",
                "Community discussion on water leakage",
                "DISCUSSION",
                orgA.getId()
        );

        mockMvc.perform(post("/api/forum/posts")
                        .with(user(superAdmin.getUsername()).roles("SUPER_ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        // Inspect complaint feed - Must NOT contain the forum title
        MvcResult complaintResult = mockMvc.perform(get("/api/issues")
                        .with(user(studentA.getUsername()).roles("STUDENT")))
                .andExpect(status().isOk())
                .andReturn();

        String complaintsBody = complaintResult.getResponse().getContentAsString();
        assertThat(complaintsBody).doesNotContain("Hostel Serious Water Problem");
        assertThat(complaintsBody).doesNotContain("Community discussion on water leakage");
    }

    @Test
    @Order(21)
    void privateComplaintDoesNotAppearInForumApis() throws Exception {
        // Inspect public forum feed - Must NOT contain testComplaint title or description
        MvcResult forumResult = mockMvc.perform(get("/api/public/forum"))
                .andExpect(status().isOk())
                .andReturn();

        String forumBody = forumResult.getResponse().getContentAsString();
        assertThat(forumBody).doesNotContain(testComplaint.getTitle());
        assertThat(forumBody).doesNotContain(testComplaint.getDescription());
        assertThat(forumBody).doesNotContain(testComplaint.getTrackingCode());
    }

    @Test
    @Order(22)
    void forumModerationCannotModifyComplaintState() throws Exception {
        long originalComplaintCount = issueRepository.count();
        IssueStatus originalStatus = testComplaint.getStatus();

        // Perform moderation on a forum post
        ModerateForumRequest modReq = new ModerateForumRequest("Locking post");
        mockMvc.perform(post("/api/admin/forum/posts/" + createdPostId + "/lock")
                        .with(user(adminA.getUsername()).roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(modReq)))
                .andExpect(status().isOk());

        // Verify complaint system remains completely unchanged
        assertThat(issueRepository.count()).isEqualTo(originalComplaintCount);
        Issue freshComplaint = issueRepository.findById(testComplaint.getId()).orElseThrow();
        assertThat(freshComplaint.getStatus()).isEqualTo(originalStatus);
    }
}
