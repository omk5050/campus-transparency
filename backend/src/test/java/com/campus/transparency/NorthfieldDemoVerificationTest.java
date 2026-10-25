package com.campus.transparency;

import com.campus.transparency.application.issue.IssueQueryService;
import com.campus.transparency.domain.issue.Issue;
import com.campus.transparency.domain.issue.IssueRepository;
import com.campus.transparency.domain.issue.IssueStatus;
import com.campus.transparency.domain.organization.Organization;
import com.campus.transparency.domain.organization.OrganizationRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class NorthfieldDemoVerificationTest {

    @Autowired
    private IssueRepository issueRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private IssueQueryService issueQueryService;

    private static final List<String> SEEDED_TITLES = List.of(
            "Persistent WiFi dead zone on 3rd floor, Library East Wing",
            "Inadequate emergency lighting in Dormer Hall stairwell C",
            "Water leakage near Engineering Block laboratory",
            "Broken air conditioning in Computer Lab 204",
            "Delayed scholarship processing for eligible students",
            "Unsafe pedestrian crossing near main campus gate",
            "Library study room booking system frequently unavailable",
            "Insufficient seating in the student cafeteria",
            "Laboratory equipment maintenance delays",
            "Broken accessibility ramp near administration building",
            "Examination timetable conflict between two departments",
            "Long queue and delays at student administration counter"
    );

    @Test
    @DisplayName("Verify all 12 Northfield demo complaints exist and satisfy constraints")
    void verifyNorthfieldDemoComplaints() {
        Optional<Organization> orgOpt = organizationRepository.findById(1L);
        assertThat(orgOpt).isPresent();

        // 1. Verify exact count of demo records
        int foundCount = 0;
        for (String title : SEEDED_TITLES) {
            List<Issue> issues = issueRepository.findAll().stream()
                    .filter(i -> title.equals(i.getTitle()))
                    .toList();
            assertThat(issues).hasSize(1);
            Issue issue = issues.get(0);
            foundCount++;

            // 2. Belongs strictly to Northfield (Org 1)
            assertThat(issue.getOrganization().getId()).isEqualTo(1L);

            // 3. Tracking code exists and follows pattern
            assertThat(issue.getTrackingCode()).isNotNull().startsWith("CMP-");

            // 4. Reporter alias exists
            assertThat(issue.getReporterAlias()).isNotNull().startsWith("Complainant #");

            // 5. Valid status
            assertThat(issue.getStatus()).isIn(
                    IssueStatus.REPORTED,
                    IssueStatus.UNDER_REVIEW,
                    IssueStatus.IN_PROGRESS,
                    IssueStatus.RESOLVED
            );

            // 6. Resolved issues must have resolved_at
            if (issue.getStatus() == IssueStatus.RESOLVED) {
                assertThat(issue.getResolvedAt()).isNotNull();
            }

            // 7. Assigned issues must be assigned to an investigator/admin within org 1
            if (issue.getAssignedTo() != null) {
                assertThat(issue.getAssignedTo().getOrganization().getId()).isEqualTo(1L);
                assertThat(issue.getAssignedTo().getRole().name()).isIn("ADMIN", "INVESTIGATOR");
            }
        }
        assertThat(foundCount).isEqualTo(12);

        // 8. Verify zero seeded issues belong to Meridian (Org 2 or other)
        Optional<Organization> meridianOpt = organizationRepository.findByName("Meridian Corporation");
        if (meridianOpt.isPresent()) {
            Long meridianId = meridianOpt.get().getId();
            long meridianSeededCount = issueRepository.findAll().stream()
                    .filter(i -> meridianId.equals(i.getOrganization().getId()))
                    .filter(i -> SEEDED_TITLES.contains(i.getTitle()))
                    .count();
            assertThat(meridianSeededCount).isZero();
        }

        // 9. Verify Northfield query service returns them for admin
        Page<Issue> paged = issueQueryService.getAllIssuesForAdmin(
                1L, null, null, null, null, null, null,
                PageRequest.of(0, 100, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id"))
        );
        assertThat(paged.getContent().stream().map(Issue::getTitle))
                .containsAll(SEEDED_TITLES);

        // 10. Verify Northfield dashboard metric counts reflect seeded data
        long totalOrg1 = issueRepository.countByOrganizationId(1L);
        assertThat(totalOrg1).isGreaterThanOrEqualTo(12);

        long reported = issueRepository.countByOrganizationIdAndStatus(1L, IssueStatus.REPORTED);
        long underReview = issueRepository.countByOrganizationIdAndStatus(1L, IssueStatus.UNDER_REVIEW);
        long inProgress = issueRepository.countByOrganizationIdAndStatus(1L, IssueStatus.IN_PROGRESS);
        long resolved = issueRepository.countByOrganizationIdAndStatus(1L, IssueStatus.RESOLVED);
        long assigned = issueRepository.countByOrganizationIdAndAssignedToIsNotNull(1L);
        long unassigned = issueRepository.countByOrganizationIdAndAssignedToIsNull(1L);

        assertThat(reported).isGreaterThanOrEqualTo(3);
        assertThat(underReview).isGreaterThanOrEqualTo(3);
        assertThat(inProgress).isGreaterThanOrEqualTo(3);
        assertThat(resolved).isGreaterThanOrEqualTo(3);
        assertThat(assigned).isGreaterThanOrEqualTo(6);
        assertThat(unassigned).isGreaterThanOrEqualTo(6);
    }
}
