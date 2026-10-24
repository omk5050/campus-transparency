package com.campus.transparency.application.attachment;

import com.campus.transparency.api.attachment.IssueAttachmentResponse;
import com.campus.transparency.domain.attachment.IssueAttachment;
import com.campus.transparency.domain.attachment.IssueAttachmentRepository;
import com.campus.transparency.domain.audit.AuditLog;
import com.campus.transparency.domain.audit.AuditLogRepository;
import com.campus.transparency.domain.issue.Issue;
import com.campus.transparency.domain.issue.IssueRepository;
import com.campus.transparency.domain.user.Role;
import com.campus.transparency.domain.user.User;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Set;

@Service
public class IssueAttachmentService {

    private static final Logger log = LoggerFactory.getLogger(IssueAttachmentService.class);
    private static final long MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024L; // 10MB default
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp"
    );

    private final IssueAttachmentRepository attachmentRepository;
    private final IssueRepository issueRepository;
    private final ImageStorageService imageStorageService;
    private final AuditLogRepository auditLogRepository;

    public IssueAttachmentService(
            IssueAttachmentRepository attachmentRepository,
            IssueRepository issueRepository,
            ImageStorageService imageStorageService,
            AuditLogRepository auditLogRepository
    ) {
        this.attachmentRepository = attachmentRepository;
        this.issueRepository = issueRepository;
        this.imageStorageService = imageStorageService;
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional(readOnly = true)
    public List<IssueAttachmentResponse> getAttachments(Long issueId, User currentUser) {
        Issue issue = getIssueWithTenantCheck(issueId, currentUser);

        List<IssueAttachment> attachments;
        if (currentUser.getRole() == Role.SUPER_ADMIN) {
            attachments = attachmentRepository.findByIssueIdOrderByCreatedAtDesc(issueId);
        } else {
            attachments = attachmentRepository.findByIssueIdAndOrganizationIdOrderByCreatedAtDesc(
                    issueId, currentUser.getOrganization().getId());
        }

        return attachments.stream().map(IssueAttachmentResponse::from).toList();
    }

    @Transactional
    public IssueAttachmentResponse uploadAttachment(Long issueId, MultipartFile file, User currentUser) {
        Issue issue = getIssueWithTenantCheck(issueId, currentUser);
        verifyAttachmentManagementPermission(currentUser);

        validateImageFile(file);

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new IllegalArgumentException("Failed to read uploaded file contents", e);
        }

        validateMagicBytes(bytes);

        String originalFilename = sanitizeFilename(file.getOriginalFilename());
        Long orgId = issue.getOrganization() != null ? issue.getOrganization().getId() : currentUser.getOrganization().getId();
        String folder = "ethos/" + orgId + "/issues/" + issue.getId() + "/attachments";

        log.info("Uploading image attachment for issue {} in org {}", issueId, orgId);
        ImageUploadResult uploadResult = imageStorageService.uploadImage(bytes, originalFilename, folder);

        IssueAttachment attachment;
        try {
            attachment = new IssueAttachment(
                    issue,
                    issue.getOrganization(),
                    currentUser,
                    originalFilename,
                    uploadResult.publicId(),
                    uploadResult.secureUrl(),
                    uploadResult.resourceType(),
                    uploadResult.format(),
                    uploadResult.bytes(),
                    uploadResult.width(),
                    uploadResult.height()
            );
            attachment = attachmentRepository.save(attachment);

            auditLogRepository.save(new AuditLog(
                    issue,
                    "ISSUE_ATTACHMENT_UPLOADED",
                    currentUser.getUsername() + " (Attachment ID: " + attachment.getId() + ")"
            ));
        } catch (Exception ex) {
            // Compensating transaction: Clean up uploaded asset in Cloudinary if database persistence fails
            log.warn("Database persistence failed after Cloudinary upload; deleting orphaned asset: {}", uploadResult.publicId());
            try {
                imageStorageService.deleteImage(uploadResult.publicId());
            } catch (Exception cleanupEx) {
                log.error("Failed to delete orphaned Cloudinary asset {}: {}", uploadResult.publicId(), cleanupEx.getMessage());
            }
            throw ex;
        }

        return IssueAttachmentResponse.from(attachment);
    }

    @Transactional
    public void deleteAttachment(Long issueId, Long attachmentId, User currentUser) {
        Issue issue = getIssueWithTenantCheck(issueId, currentUser);
        verifyAttachmentManagementPermission(currentUser);

        IssueAttachment attachment = findAttachmentWithTenantCheck(attachmentId, issueId, currentUser);

        log.info("Deleting image attachment {} for issue {}", attachmentId, issueId);
        imageStorageService.deleteImage(attachment.getCloudinaryPublicId());
        attachmentRepository.delete(attachment);

        auditLogRepository.save(new AuditLog(
                issue,
                "ISSUE_ATTACHMENT_DELETED",
                currentUser.getUsername() + " (Attachment ID: " + attachmentId + ")"
        ));
    }

    private Issue getIssueWithTenantCheck(Long issueId, User currentUser) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new EntityNotFoundException("Issue not found: " + issueId));

        if (currentUser.getRole() != Role.SUPER_ADMIN) {
            if (issue.getOrganization() == null || currentUser.getOrganization() == null ||
                    !issue.getOrganization().getId().equals(currentUser.getOrganization().getId())) {
                throw new EntityNotFoundException("Issue not found: " + issueId);
            }
        }
        return issue;
    }

    private void verifyAttachmentManagementPermission(User currentUser) {
        if (currentUser.getRole() != Role.ADMIN && currentUser.getRole() != Role.SUPER_ADMIN) {
            throw new AccessDeniedException("User is not authorized to manage attachments for this issue");
        }
    }

    private IssueAttachment findAttachmentWithTenantCheck(Long attachmentId, Long issueId, User currentUser) {
        if (currentUser.getRole() == Role.SUPER_ADMIN) {
            return attachmentRepository.findByIdAndIssueId(attachmentId, issueId)
                    .orElseThrow(() -> new EntityNotFoundException("Attachment not found: " + attachmentId));
        } else {
            return attachmentRepository.findByIdAndIssueIdAndOrganizationId(
                    attachmentId, issueId, currentUser.getOrganization().getId())
                    .orElseThrow(() -> new EntityNotFoundException("Attachment not found: " + attachmentId));
        }
    }

    private void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Attachment file cannot be null or empty");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File size exceeds maximum allowed limit of 10MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("Unsupported image format. Allowed formats: JPEG, PNG, WebP");
        }
    }

    private void validateMagicBytes(byte[] bytes) {
        if (bytes == null || bytes.length < 12) {
            throw new IllegalArgumentException("Unsupported image format. Allowed formats: JPEG, PNG, WebP");
        }

        // JPEG: FF D8 FF
        boolean isJpeg = (bytes[0] == (byte) 0xFF && bytes[1] == (byte) 0xD8 && bytes[2] == (byte) 0xFF);

        // PNG: 89 50 4E 47 0D 0A 1A 0A
        boolean isPng = (bytes[0] == (byte) 0x89 && bytes[1] == (byte) 0x50 && bytes[2] == (byte) 0x4E && bytes[3] == (byte) 0x47
                && bytes[4] == (byte) 0x0D && bytes[5] == (byte) 0x0A && bytes[6] == (byte) 0x1A && bytes[7] == (byte) 0x0A);

        // WebP: RIFF ... WEBP (0..3 is "RIFF", 8..11 is "WEBP")
        boolean isWebP = (bytes[0] == (byte) 'R' && bytes[1] == (byte) 'I' && bytes[2] == (byte) 'F' && bytes[3] == (byte) 'F'
                && bytes[8] == (byte) 'W' && bytes[9] == (byte) 'E' && bytes[10] == (byte) 'B' && bytes[11] == (byte) 'P');

        if (!isJpeg && !isPng && !isWebP) {
            throw new IllegalArgumentException("Unsupported image format. Allowed formats: JPEG, PNG, WebP");
        }
    }

    private String sanitizeFilename(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            return "attachment.jpg";
        }
        // Extract base filename without directories
        String clean = originalFilename.replace("\\", "/");
        int lastSlash = clean.lastIndexOf('/');
        if (lastSlash >= 0) {
            clean = clean.substring(lastSlash + 1);
        }
        clean = clean.replaceAll("[^a-zA-Z0-9._-]", "_");
        return clean.isEmpty() ? "attachment.jpg" : clean;
    }
}
