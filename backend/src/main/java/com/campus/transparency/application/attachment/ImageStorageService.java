package com.campus.transparency.application.attachment;

public interface ImageStorageService {

    ImageUploadResult uploadImage(byte[] imageBytes, String originalFilename, String folder);

    void deleteImage(String publicId);
}
