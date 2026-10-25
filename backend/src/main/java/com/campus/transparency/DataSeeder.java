package com.campus.transparency;

import com.campus.transparency.domain.user.Role;
import com.campus.transparency.domain.user.User;
import com.campus.transparency.domain.user.UserRepository;
import com.campus.transparency.domain.audit.AuditLogRepository;
import com.campus.transparency.domain.issue.Issue;
import com.campus.transparency.domain.issue.IssueRepository;
import com.campus.transparency.application.issue.IssueCommandService;
import com.campus.transparency.domain.organization.Organization;
import com.campus.transparency.domain.organization.OrganizationRepository;
import com.campus.transparency.domain.organization.OrganizationStatus;
import com.campus.transparency.domain.organization.OrganizationType;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Random;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final IssueCommandService issueCommandService;
    private final IssueRepository issueRepository;
    private final AuditLogRepository auditLogRepository;
    private final OrganizationRepository organizationRepository;

    public DataSeeder(UserRepository userRepository, 
                      PasswordEncoder passwordEncoder,
                      IssueCommandService issueCommandService,
                      IssueRepository issueRepository,
                      AuditLogRepository auditLogRepository,
                      OrganizationRepository organizationRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.issueCommandService = issueCommandService;
        this.issueRepository = issueRepository;
        this.auditLogRepository = auditLogRepository;
        this.organizationRepository = organizationRepository;
    }

    private void seedIssue(String title, String description, String reporterHash, int votes, Organization org) {
        Issue issue = issueCommandService.create(title, description, reporterHash, "Infrastructure", "Facilities & Operations", org);
        for(int i = 0; i < votes - 1; i++) {
            issue.upvote();
        }
        issueRepository.save(issue);
    }

    private void seedIssue(String title, String description, String reporterHash, int votes) {
        Organization defaultOrg = organizationRepository.findByName("ETHOS University Campus").orElse(null);
        seedIssue(title, description, reporterHash, votes, defaultOrg);
    }

    @Override
    public void run(String... args) throws Exception {
        Organization defaultOrg = organizationRepository.findByName("ETHOS University Campus")
                .orElseGet(() -> organizationRepository.save(new Organization(
                        "ETHOS University Campus",
                        OrganizationType.UNIVERSITY,
                        OrganizationStatus.ACTIVE,
                        "admin@ethos-campus.edu"
                )));

        if (userRepository.count() == 0) {
            String adminPassword = passwordEncoder.encode("admin123");
            User admin = new User("admin", adminPassword, Role.ADMIN, defaultOrg);
            
            String studentPassword = passwordEncoder.encode("student123");
            User student = new User("student", studentPassword, Role.STUDENT, defaultOrg);
            
            userRepository.save(admin);
            userRepository.save(student);
            System.out.println("Seeded default users: admin/admin123, student/student123");
        }

        if (userRepository.findByUsername("investigator").isEmpty()) {
            String invPassword = passwordEncoder.encode("investigator123");
            User investigator = new User("investigator", invPassword, Role.ADMIN, defaultOrg);
            userRepository.save(investigator);
            System.out.println("Seeded investigator user: investigator/investigator123");
        }

        if (userRepository.findByRole(Role.SUPER_ADMIN).isEmpty()) {
            String superAdminUsername = System.getProperty("SUPER_ADMIN_USERNAME", 
                    System.getenv().getOrDefault("SUPER_ADMIN_USERNAME", "superadmin"));
            String superAdminPassword = System.getProperty("SUPER_ADMIN_PASSWORD", 
                    System.getenv().getOrDefault("SUPER_ADMIN_PASSWORD", "superadmin123"));
            User superAdmin = new User(superAdminUsername, passwordEncoder.encode(superAdminPassword), Role.SUPER_ADMIN, null);
            userRepository.save(superAdmin);
            System.out.println("Seeded platform SUPER_ADMIN: " + superAdminUsername);
        }

        Organization meridianOrg = organizationRepository.findByName("Meridian Corporation")
                .orElseGet(() -> organizationRepository.save(new Organization(
                        "Meridian Corporation",
                        OrganizationType.CORPORATE,
                        OrganizationStatus.ACTIVE,
                        "admin@meridian.com"
                )));

        if (userRepository.findByUsername("meridian_admin").isEmpty()) {
            String meridianAdminPassword = passwordEncoder.encode("meridian123");
            User mAdmin = new User("meridian_admin", meridianAdminPassword, Role.ADMIN, meridianOrg);
            userRepository.save(mAdmin);
            System.out.println("Seeded meridian user: meridian_admin/meridian123");
        }

        userRepository.findAll().forEach(u -> {
            if (u.getRole() != Role.SUPER_ADMIN && u.getOrganization() == null) {
                u.setOrganization(defaultOrg);
                userRepository.save(u);
            }
        });

        java.io.File flag = new java.io.File(".seeded_issues_v2");
        if (!flag.exists() && issueRepository.count() == 0) {
            System.out.println("Seeding 15 professional campus issues...");
            
            Random random = new Random();

            seedIssue("HVAC Malfunction in Engineering Building Labs",
                "The air conditioning in the 3rd-floor computer labs has been non-functional for over two weeks, leading to unsafe operating temperatures for both students and high-performance workstation equipment. Immediate repair is required to prevent hardware damage.",
                "anon_1042", random.nextInt(40) + 10, defaultOrg);

            seedIssue("Inadequate Lighting on South Campus Walkways",
                "Following the recent daylight saving time change, the pathways connecting the South Campus dormitories to the main academic quad are dangerously unlit after 5 PM. Several streetlamps require immediate bulb replacement or electrical repair to ensure student safety.",
                "anon_7281", random.nextInt(60) + 20);

            seedIssue("Accessibility Ramp Damage at Student Union",
                "The concrete on the primary wheelchair-accessible ramp at the north entrance of the Student Union has cracked and eroded. This poses a significant safety hazard and violates ADA compliance guidelines. Needs urgent resurfacing.",
                "anon_3394", random.nextInt(50) + 30);

            seedIssue("Outdated Laboratory Equipment in Chemistry Annex",
                "Multiple fume hoods in the Chemistry Annex (Rooms 401-405) are failing their airflow calibration tests. This is a critical safety issue that delays practical examinations and endangers student health. A complete audit is requested.",
                "anon_8829", random.nextInt(35) + 15);

            seedIssue("Campus Shuttle Route Inefficiency and Delays",
                "The current Blue Route shuttle schedule fails to align with peak class dismissal times, resulting in extreme overcrowding and consistent 20+ minute delays during the 8 AM and 4 PM transit windows. Route optimization and additional buses are needed.",
                "anon_5102", random.nextInt(80) + 40);

            seedIssue("Substandard Wi-Fi Connectivity in Library East Wing",
                "Students working in the East Wing of the library frequently lose internet connectivity. Diagnostics reveal severe packet drop during peak hours. Additional access points are highly recommended.",
                "anon_1122", random.nextInt(75) + 30);

            seedIssue("Water Leak Damage in Humanities Lecture Hall",
                "A persistent roof leak in the main Humanities lecture hall has damaged ceiling tiles and ruined several desks in the back row. Black mold is becoming a serious concern for respiratory health.",
                "anon_3432", random.nextInt(30) + 5);

            seedIssue("Inadequate Study Spaces During Midterm Season",
                "The current study rooms and library tables are completely saturated. The university should open unused classrooms in the Business building for after-hours study during midterms and finals.",
                "anon_9091", random.nextInt(90) + 25);

            seedIssue("Cafeteria Food Cross-Contamination Concerns",
                "Students with severe peanut allergies observed cross-contamination at the salad bar. A stricter separation of allergens and staff retraining is immediately necessary.",
                "anon_4210", random.nextInt(45) + 10);

            seedIssue("Unsafe Crosswalk at Main Entrance",
                "Vehicles frequently fail to yield at the main entrance crosswalk. A flashing beacon system or speed bumps should be installed to prevent pedestrian accidents.",
                "anon_6521", random.nextInt(60) + 15);

            seedIssue("Potholes in North Parking Lot Causing Damage",
                "Deep potholes in the North Commuter lot have caused vehicle alignment and tire damage. This lot generates paid permit revenue and must be repaved this semester.",
                "anon_7312", random.nextInt(40) + 5);

            seedIssue("Lack of Mental Health Counselors on Faculty",
                "Wait times for a session at the campus counseling center exceed three weeks. The university must allocate emergency funds to hire at least two more full-time therapists.",
                "anon_8492", random.nextInt(85) + 40);

            seedIssue("Broken Elevator in Disability Services Building",
                "The main elevator in the building housing Disability Services has been out of order for three days. Students with mobility issues cannot reach their scheduled appointments.",
                "anon_1245", random.nextInt(75) + 20);

            seedIssue("Extreme Noise Pollution Near Performing Arts Center",
                "Early morning construction near the dormitories adjoining the Performing Arts Center violates local noise ordinances and severely impacts student sleep cycles.",
                "anon_9821", random.nextInt(35) + 5);

            seedIssue("Outdated Fire Extinguishers in Residential Hall G",
                "An ad-hoc inspection by a resident advisor found multiple fire extinguishers in Hall G that have not been serviced since 2018. Immediate replacement is legally mandated.",
                "anon_4431", random.nextInt(55) + 10);
            
            System.out.println("Seeded 15 unique professional signals with simulated interaction activity.");
            flag.createNewFile();
        }
    }
}
