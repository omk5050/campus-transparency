package com.campus.transparency.application.statistics;

import com.campus.transparency.api.issue.OrganizationMetricsResponse;
import com.campus.transparency.api.statistics.LeaderboardEntryResponse;
import com.campus.transparency.api.statistics.OrganizationTransparencyProfileResponse;
import com.campus.transparency.api.statistics.PublicTransparencySummaryResponse;
import com.campus.transparency.domain.issue.Issue;
import com.campus.transparency.domain.issue.IssueRepository;
import com.campus.transparency.domain.issue.IssueStatus;
import com.campus.transparency.domain.organization.Organization;
import com.campus.transparency.domain.organization.OrganizationRepository;
import com.campus.transparency.domain.organization.OrganizationStatus;
import com.campus.transparency.domain.statistics.QualificationStatus;
import com.campus.transparency.domain.statistics.TimePeriod;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
public class OrganizationStatisticsService {

    private final IssueRepository issueRepository;
    private final OrganizationRepository organizationRepository;

    public OrganizationStatisticsService(IssueRepository issueRepository, OrganizationRepository organizationRepository) {
        this.issueRepository = issueRepository;
        this.organizationRepository = organizationRepository;
    }

    @Transactional(readOnly = true)
    public OrganizationMetricsResponse calculateOrganizationMetrics(Long organizationId, TimePeriod period) {
        Instant since = period.getStartInstant();

        long total = issueRepository.countByOrganizationIdAndCreatedAtGreaterThanEqual(organizationId, since);
        long reported = issueRepository.countByOrganizationIdAndStatusAndCreatedAtGreaterThanEqual(organizationId, IssueStatus.REPORTED, since);
        long underReview = issueRepository.countByOrganizationIdAndStatusAndCreatedAtGreaterThanEqual(organizationId, IssueStatus.UNDER_REVIEW, since);
        long inProgress = issueRepository.countByOrganizationIdAndStatusAndCreatedAtGreaterThanEqual(organizationId, IssueStatus.IN_PROGRESS, since);
        long resolved = issueRepository.countByOrganizationIdAndStatusAndCreatedAtGreaterThanEqual(organizationId, IssueStatus.RESOLVED, since);
        long rejected = issueRepository.countByOrganizationIdAndStatusAndCreatedAtGreaterThanEqual(organizationId, IssueStatus.REJECTED, since);
        long assigned = issueRepository.countByOrganizationIdAndAssignedToIsNotNullAndCreatedAtGreaterThanEqual(organizationId, since);
        long unassigned = issueRepository.countByOrganizationIdAndAssignedToIsNullAndCreatedAtGreaterThanEqual(organizationId, since);

        long eligible = Math.max(0, total - rejected);
        double resolutionRate = eligible > 0
                ? Math.round(((double) resolved / eligible * 100.0) * 10.0) / 10.0
                : 0.0;

        List<Issue> resolvedIssues = issueRepository.findResolvedByOrganizationIdAndPeriod(organizationId, since);
        double[] resolutionTimes = calculateResolutionTimes(resolvedIssues);
        double avgHours = resolutionTimes[0];
        double medianHours = resolutionTimes[1];

        double ethosScore = calculateEthosScore(total, eligible, resolved, resolutionRate, medianHours);
        QualificationStatus qualStatus = eligible >= 10 ? QualificationStatus.QUALIFIED : QualificationStatus.PROVISIONAL;

        Map<String, Long> categoryMap = new LinkedHashMap<>();
        for (Object[] row : issueRepository.countGroupedByCategory(organizationId, since)) {
            if (row[0] != null && row[1] != null) {
                categoryMap.put((String) row[0], ((Number) row[1]).longValue());
            }
        }

        Map<String, Long> deptMap = new LinkedHashMap<>();
        for (Object[] row : issueRepository.countGroupedByDepartment(organizationId, since)) {
            if (row[0] != null && row[1] != null) {
                deptMap.put((String) row[0], ((Number) row[1]).longValue());
            }
        }

        return new OrganizationMetricsResponse(
                total,
                reported,
                inProgress,
                resolved,
                rejected,
                assigned,
                unassigned,
                resolutionRate,
                avgHours,
                medianHours,
                ethosScore,
                qualStatus.name(),
                categoryMap,
                deptMap,
                period.name()
        );
    }

    @Transactional(readOnly = true)
    public List<LeaderboardEntryResponse> getLeaderboard(TimePeriod period) {
        Instant since = period.getStartInstant();
        List<Organization> activeOrgs = organizationRepository.findByStatus(OrganizationStatus.ACTIVE);
        if (activeOrgs.isEmpty()) {
            return Collections.emptyList();
        }

        // Batch 1: Get counts grouped by (orgId, status)
        List<Object[]> statusCounts = issueRepository.countActiveGroupedByOrgAndStatus(since);
        Map<Long, Map<IssueStatus, Long>> orgStatusMap = new HashMap<>();
        for (Object[] row : statusCounts) {
            Long orgId = (Long) row[0];
            IssueStatus status = (IssueStatus) row[1];
            Long count = ((Number) row[2]).longValue();
            orgStatusMap.computeIfAbsent(orgId, k -> new EnumMap<>(IssueStatus.class)).put(status, count);
        }

        // Batch 2: Get resolved issues for active organizations to calculate resolution speed
        List<Issue> resolvedIssues = issueRepository.findActiveResolvedByPeriod(since);
        Map<Long, List<Issue>> orgResolvedMap = new HashMap<>();
        for (Issue issue : resolvedIssues) {
            if (issue.getOrganization() != null && issue.getOrganization().getId() != null) {
                orgResolvedMap.computeIfAbsent(issue.getOrganization().getId(), k -> new ArrayList<>()).add(issue);
            }
        }

        List<LeaderboardEntryResponse> entries = new ArrayList<>(activeOrgs.size());
        for (Organization org : activeOrgs) {
            Map<IssueStatus, Long> counts = orgStatusMap.getOrDefault(org.getId(), Collections.emptyMap());
            long reported = counts.getOrDefault(IssueStatus.REPORTED, 0L);
            long underReview = counts.getOrDefault(IssueStatus.UNDER_REVIEW, 0L);
            long inProgress = counts.getOrDefault(IssueStatus.IN_PROGRESS, 0L);
            long resolved = counts.getOrDefault(IssueStatus.RESOLVED, 0L);
            long rejected = counts.getOrDefault(IssueStatus.REJECTED, 0L);
            long total = reported + underReview + inProgress + resolved + rejected;

            long eligible = Math.max(0, total - rejected);
            double resolutionRate = eligible > 0
                    ? Math.round(((double) resolved / eligible * 100.0) * 10.0) / 10.0
                    : 0.0;

            List<Issue> orgResolved = orgResolvedMap.getOrDefault(org.getId(), Collections.emptyList());
            double[] resolutionTimes = calculateResolutionTimes(orgResolved);
            double avgHours = resolutionTimes[0];
            double medianHours = resolutionTimes[1];

            double ethosScore = calculateEthosScore(total, eligible, resolved, resolutionRate, medianHours);
            QualificationStatus qualStatus = eligible >= 10 ? QualificationStatus.QUALIFIED : QualificationStatus.PROVISIONAL;

            entries.add(new LeaderboardEntryResponse(
                    0, // set during sorting
                    org.getId(),
                    org.getName(),
                    org.getOrganizationType(),
                    ethosScore,
                    resolutionRate,
                    avgHours,
                    medianHours,
                    eligible,
                    total,
                    resolved,
                    qualStatus.name()
            ));
        }

        // Sort: primary = ethosScore desc, secondary = resolutionRate desc, tertiary = medianResolutionHours asc, quaternary = name asc
        entries.sort((a, b) -> {
            int c = Double.compare(b.ethosScore(), a.ethosScore());
            if (c != 0) return c;
            c = Double.compare(b.resolutionRate(), a.resolutionRate());
            if (c != 0) return c;
            c = Double.compare(a.medianResolutionHours(), b.medianResolutionHours());
            if (c != 0) return c;
            return a.organizationName().compareToIgnoreCase(b.organizationName());
        });

        List<LeaderboardEntryResponse> ranked = new ArrayList<>(entries.size());
        for (int i = 0; i < entries.size(); i++) {
            LeaderboardEntryResponse e = entries.get(i);
            ranked.add(new LeaderboardEntryResponse(
                    i + 1,
                    e.organizationId(),
                    e.organizationName(),
                    e.organizationType(),
                    e.ethosScore(),
                    e.resolutionRate(),
                    e.averageResolutionHours(),
                    e.medianResolutionHours(),
                    e.totalEligibleComplaints(),
                    e.totalComplaints(),
                    e.resolvedComplaints(),
                    e.qualificationStatus()
            ));
        }

        return ranked;
    }

    @Transactional(readOnly = true)
    public PublicTransparencySummaryResponse getPublicTransparencySummary(TimePeriod period) {
        Instant since = period.getStartInstant();
        long totalOrgs = organizationRepository.count();
        long activeOrgs = organizationRepository.countByStatus(OrganizationStatus.ACTIVE);

        long totalComplaintsPlatform = issueRepository.countByCreatedAtGreaterThanEqual(since);
        long resolvedComplaintsPlatform = issueRepository.countByStatusAndCreatedAtGreaterThanEqual(IssueStatus.RESOLVED, since);
        long rejectedComplaintsPlatform = issueRepository.countByStatusAndCreatedAtGreaterThanEqual(IssueStatus.REJECTED, since);

        long eligiblePlatform = Math.max(0, totalComplaintsPlatform - rejectedComplaintsPlatform);
        double platformResolutionRate = eligiblePlatform > 0
                ? Math.round(((double) resolvedComplaintsPlatform / eligiblePlatform * 100.0) * 10.0) / 10.0
                : 0.0;

        List<Issue> allResolved = issueRepository.findAllResolvedByPeriod(since);
        double[] platformTimes = calculateResolutionTimes(allResolved);

        List<LeaderboardEntryResponse> leaderboard = getLeaderboard(period);

        return new PublicTransparencySummaryResponse(
                totalOrgs,
                activeOrgs,
                totalComplaintsPlatform,
                resolvedComplaintsPlatform,
                platformResolutionRate,
                platformTimes[0],
                platformTimes[1],
                leaderboard
        );
    }

    @Transactional(readOnly = true)
    public OrganizationTransparencyProfileResponse getOrganizationTransparencyProfile(Long organizationId, TimePeriod period) {
        Organization org = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Organization not found with id: " + organizationId));

        OrganizationMetricsResponse metrics = calculateOrganizationMetrics(organizationId, period);
        long active = metrics.reportedComplaints() + metrics.inProgressComplaints();
        long eligible = Math.max(0, metrics.totalComplaints() - metrics.rejectedComplaints());

        return new OrganizationTransparencyProfileResponse(
                org.getId(),
                org.getName(),
                org.getOrganizationType(),
                org.getStatus(),
                metrics.ethosScore(),
                metrics.qualificationStatus(),
                metrics.resolutionRate(),
                metrics.averageResolutionHours(),
                metrics.medianResolutionHours(),
                metrics.totalComplaints(),
                eligible,
                active,
                metrics.resolvedComplaints(),
                metrics.rejectedComplaints(),
                metrics.complaintsByCategory(),
                metrics.complaintsByDepartment(),
                period.name()
        );
    }

    public double calculateEthosScore(
            long totalComplaints,
            long eligibleComplaints,
            long resolvedComplaints,
            double resolutionRate,
            double medianResolutionHours
    ) {
        if (totalComplaints == 0 || eligibleComplaints == 0) {
            return 0.0;
        }

        // 1. Resolution Rate Dimension (35%)
        double rateScore = Math.max(0.0, Math.min(100.0, resolutionRate));

        // 2. Resolution Speed Dimension (30%)
        // <= 24 hours: 100.0, >= 1440 hours (60 days): 0.0
        double speedScore;
        if (resolvedComplaints == 0) {
            speedScore = 0.0;
        } else if (medianResolutionHours <= 24.0) {
            speedScore = 100.0;
        } else if (medianResolutionHours >= 1440.0) {
            speedScore = 0.0;
        } else {
            speedScore = Math.max(0.0, 100.0 - ((medianResolutionHours - 24.0) / (1440.0 - 24.0) * 100.0));
        }

        // 3. Case Actionability / Health Dimension (20%)
        double actionabilityScore = Math.max(0.0, Math.min(100.0, ((double) eligibleComplaints / totalComplaints) * 100.0));

        // 4. Institutional Engagement Volume Dimension (15%)
        double engagementScore = Math.max(0.0, Math.min(100.0, ((double) totalComplaints / 25.0) * 100.0));

        double weightedTotal = (0.35 * rateScore) + (0.30 * speedScore) + (0.20 * actionabilityScore) + (0.15 * engagementScore);
        return Math.round(Math.max(0.0, Math.min(100.0, weightedTotal)) * 10.0) / 10.0;
    }

    private double[] calculateResolutionTimes(List<Issue> resolvedIssues) {
        if (resolvedIssues == null || resolvedIssues.isEmpty()) {
            return new double[]{0.0, 0.0};
        }

        List<Double> hoursList = new ArrayList<>(resolvedIssues.size());
        double sum = 0.0;

        for (Issue issue : resolvedIssues) {
            Instant end = issue.getResolvedAt();
            if (end == null) {
                end = issue.getUpdatedAt();
            }
            Instant start = issue.getCreatedAt();
            if (start != null && end != null && !end.isBefore(start)) {
                double hours = (end.toEpochMilli() - start.toEpochMilli()) / (1000.0 * 3600.0);
                hoursList.add(hours);
                sum += hours;
            }
        }

        if (hoursList.isEmpty()) {
            return new double[]{0.0, 0.0};
        }

        double avg = Math.round((sum / hoursList.size()) * 10.0) / 10.0;

        Collections.sort(hoursList);
        int size = hoursList.size();
        double median;
        if (size % 2 == 1) {
            median = hoursList.get(size / 2);
        } else {
            median = (hoursList.get(size / 2 - 1) + hoursList.get(size / 2)) / 2.0;
        }
        median = Math.round(median * 10.0) / 10.0;

        return new double[]{avg, median};
    }
}
