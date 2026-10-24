package com.campus.transparency.application.attachment;

public record ImageUploadResult(
        String publicId,
        String secureUrl,
        String format,
        String resourceType,
        Long bytes,
        Integer width,
        Integer height
) {}
