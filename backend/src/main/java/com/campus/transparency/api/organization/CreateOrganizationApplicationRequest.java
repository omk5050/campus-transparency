package com.campus.transparency.api.organization;

import com.campus.transparency.domain.organization.OrganizationType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateOrganizationApplicationRequest(
        @NotBlank(message = "Organization name is required")
        @Size(max = 200, message = "Organization name must not exceed 200 characters")
        String organizationName,

        @NotNull(message = "Organization type is required")
        OrganizationType organizationType,

        @NotBlank(message = "Official email is required")
        @Email(message = "Invalid official email format")
        @Size(max = 255, message = "Official email must not exceed 255 characters")
        String officialEmail,

        @NotBlank(message = "Contact person is required")
        @Size(max = 100, message = "Contact person must not exceed 100 characters")
        String contactPerson,

        @NotBlank(message = "Address is required")
        @Size(max = 500, message = "Address must not exceed 500 characters")
        String address,

        @Size(max = 255, message = "Website must not exceed 255 characters")
        String website,

        @NotBlank(message = "Description is required")
        @Size(max = 2000, message = "Description must not exceed 2000 characters")
        String description,

        @NotBlank(message = "Requested administrator email is required")
        @Email(message = "Invalid administrator email format")
        @Size(max = 255, message = "Administrator email must not exceed 255 characters")
        String requestedAdminEmail,

        @NotBlank(message = "Requested administrator username is required")
        @Size(min = 3, max = 100, message = "Administrator username must be between 3 and 100 characters")
        String requestedAdminUsername,

        @NotBlank(message = "Requested administrator password is required")
        @Size(min = 6, max = 100, message = "Administrator password must be between 6 and 100 characters")
        String requestedAdminPassword
) {}
