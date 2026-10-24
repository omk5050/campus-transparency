package com.campus.transparency.application.attachment;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Map;

@Service
public class CloudinaryImageStorageService implements ImageStorageService {

    private static final Logger log = LoggerFactory.getLogger(CloudinaryImageStorageService.class);

    private final Cloudinary cloudinary;
    private final boolean isConfigured;

    @org.springframework.beans.factory.annotation.Autowired
    public CloudinaryImageStorageService(
            @Value("${CLOUDINARY_CLOUD_NAME:${cloudinary.cloud-name:}}") String cloudName,
            @Value("${CLOUDINARY_API_KEY:${cloudinary.api-key:}}") String apiKey,
            @Value("${CLOUDINARY_API_SECRET:${cloudinary.api-secret:}}") String apiSecret
    ) {
        if (cloudName != null && !cloudName.isBlank()
                && apiKey != null && !apiKey.isBlank()
                && apiSecret != null && !apiSecret.isBlank()) {
            this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                    "cloud_name", cloudName.trim(),
                    "api_key", apiKey.trim(),
                    "api_secret", apiSecret.trim(),
                    "secure", true
            ));
            this.isConfigured = true;
            log.info("Cloudinary storage initialized securely (cloud-name configured)");
        } else {
            this.cloudinary = null;
            this.isConfigured = false;
            log.warn("Cloudinary storage credentials not fully configured; storage operations will fail if invoked");
        }
    }

    // Constructor for testing with mock Cloudinary instance
    public CloudinaryImageStorageService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
        this.isConfigured = cloudinary != null;
    }

    @Override
    public ImageUploadResult uploadImage(byte[] imageBytes, String originalFilename, String folder) {
        if (!isConfigured || cloudinary == null) {
            throw new ImageStorageException("Cloudinary service is not configured with valid credentials");
        }

        try {
            Map<String, Object> params = ObjectUtils.asMap(
                    "folder", folder,
                    "resource_type", "image",
                    "use_filename", false,
                    "unique_filename", true
            );

            @SuppressWarnings("unchecked")
            Map<String, Object> uploadResult = cloudinary.uploader().upload(imageBytes, params);

            String publicId = (String) uploadResult.get("public_id");
            String secureUrl = (String) uploadResult.get("secure_url");
            String format = (String) uploadResult.get("format");
            String resourceType = (String) uploadResult.getOrDefault("resource_type", "image");
            
            Long bytes = null;
            Object bytesObj = uploadResult.get("bytes");
            if (bytesObj instanceof Number num) {
                bytes = num.longValue();
            } else if (bytesObj != null) {
                bytes = Long.parseLong(bytesObj.toString());
            } else {
                bytes = (long) imageBytes.length;
            }

            Integer width = null;
            Object widthObj = uploadResult.get("width");
            if (widthObj instanceof Number num) {
                width = num.intValue();
            }

            Integer height = null;
            Object heightObj = uploadResult.get("height");
            if (heightObj instanceof Number num) {
                height = num.intValue();
            }

            return new ImageUploadResult(publicId, secureUrl, format, resourceType, bytes, width, height);
        } catch (IOException e) {
            log.error("Failed to upload image to Cloudinary: {}", e.getMessage());
            throw new ImageStorageException("Image upload to Cloudinary failed: " + e.getMessage(), e);
        }
    }

    @Override
    public void deleteImage(String publicId) {
        if (!isConfigured || cloudinary == null) {
            throw new ImageStorageException("Cloudinary service is not configured with valid credentials");
        }

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> result = cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            String status = (String) result.get("result");
            if ("error".equalsIgnoreCase(status)) {
                log.error("Cloudinary returned error when deleting publicId: {}", publicId);
                throw new ImageStorageException("Cloudinary failed to delete asset: " + publicId);
            }
            log.info("Cloudinary asset deleted successfully (publicId: {})", publicId);
        } catch (IOException e) {
            log.error("Exception during Cloudinary image deletion: {}", e.getMessage());
            throw new ImageStorageException("Failed to delete image from Cloudinary: " + e.getMessage(), e);
        }
    }
}
