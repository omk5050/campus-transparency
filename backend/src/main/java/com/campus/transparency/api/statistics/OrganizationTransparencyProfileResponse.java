package com.campus.transparency.api.statistics;

import com.campus.transparency.domain.organization.OrganizationStatus;
import com.campus.transparency.domain.organization.OrganizationType;

import java.util.Map;

public record OrganizationTransparencyProfileResponse(
        Long organizationId,
        String organizationName,
        OrganizationType organizationType,
        OrganizationStatus status,
        double ethosScore,
        String qualificationStatus,
        double resolutionRate,
        double averageResolutionHours,
        double medianResolutionHours,
        long totalComplaints,
        long eligibleComplaints,
        long activeComplaints,
        long resolvedComplaints,
        long rejectedComplaints,
        Map<String, Long> complaintsByCategory,
        Map<String, Long> complaintsByDepartment,
        String period
) {}
