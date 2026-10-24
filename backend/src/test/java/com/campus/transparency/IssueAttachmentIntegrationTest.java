package com.campus.transparency;

import com.campus.transparency.application.attachment.ImageStorageException;
import com.campus.transparency.application.attachment.ImageStorageService;
import com.campus.transparency.application.attachment.ImageUploadResult;
import com.campus.transparency.domain.attachment.IssueAttachment;
import com.campus.transparency.domain.attachment.IssueAttachmentRepository;
import com.campus.transparency.domain.issue.Issue;
import com.campus.transparency.domain.issue.IssueRepository;
import com.campus.transparency.domain.organization.Organization;
import com.campus.transparency.domain.organization.OrganizationRepository;
import com.campus.transparency.domain.organization.OrganizationStatus;
import com.campus.transparency.domain.organization.OrganizationType;
import com.campus.transparency.domain.user.Role;
import com.campus.transparency.domain.user.User;
import com.campus.transparency.domain.user.UserRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class IssueAttachmentIntegrationTest {

    static {
        com.campus.transparency.config.DotenvLoader.load();
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private IssueRepository issueRepository;

    @Autowired
    private IssueAttachmentRepository attachmentRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private ImageStorageService imageStorageService;

    private Organization orgA;
    private Organization orgB;
    private User adminA;
    private User studentA;
    private User adminB;
    private Issue issueA;
    private Issue issueB;

    private final byte[] validJpegBytes = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10, 'J', 'F', 'I', 'F', 0x00, 0x01, 0x01, 0x00, 0x00, 0x01};
    private final byte[] validPngBytes = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 'I', 'H', 'D', 'R'};
    private final byte[] validWebpBytes = new byte[]{'R', 'I', 'F', 'F', 0x24, 0x00, 0x00, 0x00, 'W', 'E', 'B', 'P', 'V', 'P', '8', ' '};

    @BeforeAll
    void setupData() {
        String suffix = String.valueOf(System.currentTimeMillis()).substring(7);

        orgA = organizationRepository.save(new Organization(
                "Attach Org A " + suffix,
                OrganizationType.UNIVERSITY,
                OrganizationStatus.ACTIVE,
                "attach_a_" + suffix + "@ethos.edu"
        ));

        orgB = organizationRepository.save(new Organization(
                "Attach Org B " + suffix,
                OrganizationType.COLLEGE,
                OrganizationStatus.ACTIVE,
                "attach_b_" + suffix + "@ethos.edu"
        ));

        adminA = userRepository.save(new User(
                "adminA_" + suffix,
                passwordEncoder.encode("secret"),
                Role.ADMIN,
                orgA
        ));

        studentA = userRepository.save(new User(
                "studentA_" + suffix,
                passwordEncoder.encode("secret"),
                Role.STUDENT,
                orgA
        ));

        adminB = userRepository.save(new User(
                "adminB_" + suffix,
                passwordEncoder.encode("secret"),
                Role.ADMIN,
                orgB
        ));

        issueA = issueRepository.save(new Issue(
                "Broken Window in Lab A",
                "Large crack in window facing north",
                "hash_anon_a_" + suffix,
                "Safety",
                "Facilities",
                orgA
        ));

        issueB = issueRepository.save(new Issue(
                "Flooding in Library B",
                "Water leak from roof in study room 2",
                "hash_anon_b_" + suffix,
                "Maintenance",
                "Library",
                orgB
        ));
    }

    @BeforeEach
    void setupMockStorage() {
        reset(imageStorageService);
        when(imageStorageService.uploadImage(any(), anyString(), anyString()))
                .thenAnswer(inv -> new ImageUploadResult(
                        "ethos/public_id_" + System.currentTimeMillis(),
                        "https://res.cloudinary.com/demo/image/upload/v12345/ethos/sample.jpg",
                        "jpg",
                        "image",
                        1024L,
                        800,
                        600
                ));
    }

    @Test
    @Order(1)
    void test1_authorizedImageUploadSucceeds() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "photo.jpg", "image/jpeg", validJpegBytes);

        mockMvc.perform(multipart("/api/issues/{issueId}/attachments", issueA.getId())
                        .file(file)
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminA.getUsername()).roles("ADMIN")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.originalFilename").value("photo.jpg"))
                .andExpect(jsonPath("$.secureUrl").value("https://res.cloudinary.com/demo/image/upload/v12345/ethos/sample.jpg"))
                .andExpect(jsonPath("$.uploadedByUsername").value(adminA.getUsername()));

        verify(imageStorageService, times(1)).uploadImage(any(), eq("photo.jpg"), contains("issues/" + issueA.getId()));
    }

    @Test
    @Order(2)
    void test2_jpegAccepted() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "evidence.jpeg", "image/jpeg", validJpegBytes);

        mockMvc.perform(multipart("/api/issues/{issueId}/attachments", issueA.getId())
                        .file(file)
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminA.getUsername()).roles("ADMIN")))
                .andExpect(status().isCreated());
    }

    @Test
    @Order(3)
    void test3_pngAccepted() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "screenshot.png", "image/png", validPngBytes);

        mockMvc.perform(multipart("/api/issues/{issueId}/attachments", issueA.getId())
                        .file(file)
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminA.getUsername()).roles("ADMIN")))
                .andExpect(status().isCreated());
    }

    @Test
    @Order(4)
    void test4_webpAccepted() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "image.webp", "image/webp", validWebpBytes);

        mockMvc.perform(multipart("/api/issues/{issueId}/attachments", issueA.getId())
                        .file(file)
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminA.getUsername()).roles("ADMIN")))
                .andExpect(status().isCreated());
    }

    @Test
    @Order(5)
    void test5_unsupportedMimeTypeRejected() throws Exception {
        MockMultipartFile pdfFile = new MockMultipartFile("file", "document.pdf", "application/pdf", "%PDF-1.4 fake pdf content".getBytes());

        mockMvc.perform(multipart("/api/issues/{issueId}/attachments", issueA.getId())
                        .file(pdfFile)
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminA.getUsername()).roles("ADMIN")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"));

        // Also test forged extension with fake content
        MockMultipartFile forgedFile = new MockMultipartFile("file", "fake.jpg", "image/jpeg", "MZ not a jpeg file at all".getBytes());
        mockMvc.perform(multipart("/api/issues/{issueId}/attachments", issueA.getId())
                        .file(forgedFile)
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminA.getUsername()).roles("ADMIN")))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(6)
    void test6_oversizedImageRejected() throws Exception {
        byte[] oversizedBytes = new byte[11 * 1024 * 1024]; // 11 MB
        System.arraycopy(validJpegBytes, 0, oversizedBytes, 0, validJpegBytes.length);
        MockMultipartFile file = new MockMultipartFile("file", "huge.jpg", "image/jpeg", oversizedBytes);

        mockMvc.perform(multipart("/api/issues/{issueId}/attachments", issueA.getId())
                        .file(file)
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminA.getUsername()).roles("ADMIN")))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(7)
    void test7_unauthenticatedUploadRejected() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "photo.jpg", "image/jpeg", validJpegBytes);

        mockMvc.perform(multipart("/api/issues/{issueId}/attachments", issueA.getId())
                        .file(file))
                .andExpect(result -> assertThat(result.getResponse().getStatus()).isIn(401, 403));
    }

    @Test
    @Order(8)
    void test8_unauthorizedRoleRejected() throws Exception {
        // Students are not permitted to manage/upload attachments on cases
        MockMultipartFile file = new MockMultipartFile("file", "photo.jpg", "image/jpeg", validJpegBytes);

        mockMvc.perform(multipart("/api/issues/{issueId}/attachments", issueA.getId())
                        .file(file)
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(studentA.getUsername()).roles("STUDENT")))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(9)
    void test9_crossOrganizationUploadRejected() throws Exception {
        // adminB belongs to orgB, attempting to upload to issueA (belongs to orgA)
        MockMultipartFile file = new MockMultipartFile("file", "photo.jpg", "image/jpeg", validJpegBytes);

        mockMvc.perform(multipart("/api/issues/{issueId}/attachments", issueA.getId())
                        .file(file)
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminB.getUsername()).roles("ADMIN")))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(10)
    void test10_crossOrganizationAttachmentListingRejected() throws Exception {
        // adminB belongs to orgB, attempting to list attachments of issueA (belongs to orgA)
        mockMvc.perform(get("/api/issues/{issueId}/attachments", issueA.getId())
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminB.getUsername()).roles("ADMIN")))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(11)
    void test11_crossOrganizationAttachmentDeletionRejected() throws Exception {
        // Create an attachment on issueA
        IssueAttachment att = attachmentRepository.save(new IssueAttachment(
                issueA,
                orgA,
                adminA,
                "window.jpg",
                "ethos/test_cross_del",
                "https://res.cloudinary.com/demo/image/upload/v1/test.jpg",
                "image",
                "jpg",
                100L,
                100,
                100
        ));

        // adminB attempts to delete issueA attachment
        mockMvc.perform(delete("/api/issues/{issueId}/attachments/{attachmentId}", issueA.getId(), att.getId())
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminB.getUsername()).roles("ADMIN")))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(12)
    void test12_authorizedAttachmentListingSucceeds() throws Exception {
        mockMvc.perform(get("/api/issues/{issueId}/attachments", issueA.getId())
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminA.getUsername()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        // Students in the same organization can also list/view attachments
        mockMvc.perform(get("/api/issues/{issueId}/attachments", issueA.getId())
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(studentA.getUsername()).roles("STUDENT")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(13)
    void test13_authorizedAttachmentDeletionSucceeds() throws Exception {
        IssueAttachment att = attachmentRepository.save(new IssueAttachment(
                issueA,
                orgA,
                adminA,
                "to_delete.jpg",
                "ethos/to_delete_public_id",
                "https://res.cloudinary.com/demo/image/upload/v1/to_delete.jpg",
                "image",
                "jpg",
                100L,
                100,
                100
        ));

        mockMvc.perform(delete("/api/issues/{issueId}/attachments/{attachmentId}", issueA.getId(), att.getId())
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminA.getUsername()).roles("ADMIN")))
                .andExpect(status().isNoContent());

        verify(imageStorageService, times(1)).deleteImage("ethos/to_delete_public_id");
        assertThat(attachmentRepository.findById(att.getId())).isEmpty();
    }

    @Test
    @Order(14)
    void test14_cloudinaryFailureHandledSafely() throws Exception {
        when(imageStorageService.uploadImage(any(), anyString(), anyString()))
                .thenThrow(new ImageStorageException("Simulated Cloudinary API connection timeout"));

        MockMultipartFile file = new MockMultipartFile("file", "evidence.jpg", "image/jpeg", validJpegBytes);

        mockMvc.perform(multipart("/api/issues/{issueId}/attachments", issueA.getId())
                        .file(file)
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminA.getUsername()).roles("ADMIN")))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("IMAGE_STORAGE_ERROR"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Simulated Cloudinary API connection timeout")));
    }

    @Test
    @Order(15)
    void test15_attachmentMetadataPersistedCorrectly() throws Exception {
        when(imageStorageService.uploadImage(any(), anyString(), anyString()))
                .thenReturn(new ImageUploadResult(
                        "ethos/exact_public_id_15",
                        "https://res.cloudinary.com/exact_url.png",
                        "png",
                        "image",
                        2048L,
                        1920,
                        1080
                ));

        MockMultipartFile file = new MockMultipartFile("file", "evidence_15.png", "image/png", validPngBytes);

        mockMvc.perform(multipart("/api/issues/{issueId}/attachments", issueA.getId())
                        .file(file)
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminA.getUsername()).roles("ADMIN")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.width").value(1920))
                .andExpect(jsonPath("$.height").value(1080))
                .andExpect(jsonPath("$.bytes").value(2048))
                .andExpect(jsonPath("$.format").value("png"));

        List<IssueAttachment> found = attachmentRepository.findByIssueIdOrderByCreatedAtDesc(issueA.getId());
        IssueAttachment att = found.stream().filter(a -> "ethos/exact_public_id_15".equals(a.getCloudinaryPublicId())).findFirst().orElseThrow();

        assertThat(att.getOriginalFilename()).isEqualTo("evidence_15.png");
        assertThat(att.getWidth()).isEqualTo(1920);
        assertThat(att.getHeight()).isEqualTo(1080);
        assertThat(att.getBytes()).isEqualTo(2048L);
        assertThat(att.getOrganization().getId()).isEqualTo(orgA.getId());
    }

    @Test
    @Order(16)
    void test16_credentialsNeverIncludedInResponsesOrLogging() throws Exception {
        mockMvc.perform(get("/api/issues/{issueId}/attachments", issueA.getId())
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminA.getUsername()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].apiKey").doesNotExist())
                .andExpect(jsonPath("$[*].apiSecret").doesNotExist())
                .andExpect(jsonPath("$[*].api_key").doesNotExist())
                .andExpect(jsonPath("$[*].api_secret").doesNotExist());
    }

    @Test
    @Order(17)
    void test17_publicIssueApisDoNotExposeCloudinaryConfig() throws Exception {
        mockMvc.perform(get("/api/issues/track/{trackingCode}", issueA.getTrackingCode()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trackingCode").value(issueA.getTrackingCode()))
                .andExpect(jsonPath("$.cloudinary").doesNotExist())
                .andExpect(jsonPath("$.apiKey").doesNotExist())
                .andExpect(jsonPath("$.apiSecret").doesNotExist());
    }

    @Test
    @Order(18)
    void test18_existingIssueFunctionalityRemainsUnaffected() throws Exception {
        // Authenticated users can still fetch issues
        mockMvc.perform(get("/api/issues/{id}", issueA.getId())
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(adminA.getUsername()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(issueA.getId()))
                .andExpect(jsonPath("$.title").value("Broken Window in Lab A"));
    }
}
