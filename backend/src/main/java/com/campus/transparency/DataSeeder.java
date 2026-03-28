package com.campus.transparency;

import com.campus.transparency.domain.user.Role;
import com.campus.transparency.domain.user.User;
import com.campus.transparency.domain.user.UserRepository;
import com.campus.transparency.domain.audit.AuditLogRepository;
import com.campus.transparency.domain.issue.IssueRepository;
import com.campus.transparency.application.issue.IssueCommandService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final IssueCommandService issueCommandService;
    private final IssueRepository issueRepository;
    private final AuditLogRepository auditLogRepository;

    public DataSeeder(UserRepository userRepository, 
                      PasswordEncoder passwordEncoder,
                      IssueCommandService issueCommandService,
                      IssueRepository issueRepository,
                      AuditLogRepository auditLogRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.issueCommandService = issueCommandService;
        this.issueRepository = issueRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.count() == 0) {
            String adminPassword = passwordEncoder.encode("admin123");
            User admin = new User("admin", adminPassword, Role.ADMIN);
            
            String studentPassword = passwordEncoder.encode("student123");
            User student = new User("student", studentPassword, Role.STUDENT);
            
            userRepository.save(admin);
            userRepository.save(student);
            System.out.println("Seeded default users: admin/admin123, student/student123");
        }

        // Wipe existing issues and seed fresh professional campus problems once
        java.io.File flag = new java.io.File(".seeded_issues");
        if (!flag.exists()) {
            System.out.println("Clearing and reseeding professional campus issues...");
            auditLogRepository.deleteAllInBatch();
            issueRepository.deleteAllInBatch();
            
            issueCommandService.create(
                "HVAC Malfunction in Engineering Building Labs",
                "The air conditioning in the 3rd-floor computer labs has been non-functional for over two weeks, leading to unsafe operating temperatures for both students and high-performance workstation equipment. Immediate repair is required to prevent hardware damage.",
                "anon_1042"
            );

            issueCommandService.create(
                "Inadequate Lighting on South Campus Walkways",
                "Following the recent daylight saving time change, the pathways connecting the South Campus dormitories to the main academic quad are dangerously unlit after 5 PM. Several streetlamps require immediate bulb replacement or electrical repair to ensure student safety.",
                "anon_7281"
            );

            issueCommandService.create(
                "Accessibility Ramp Damage at Student Union",
                "The concrete on the primary wheelchair-accessible ramp at the north entrance of the Student Union has cracked and eroded. This poses a significant safety hazard and violates ADA compliance guidelines. Needs urgent resurfacing.",
                "anon_3394"
            );

            issueCommandService.create(
                "Outdated Laboratory Equipment in Chemistry Annex",
                "Multiple fume hoods in the Chemistry Annex (Rooms 401-405) are failing their airflow calibration tests. This is a critical safety issue that delays practical examinations and endangers student health. A complete audit is requested.",
                "anon_8829"
            );

            issueCommandService.create(
                "Campus Shuttle Route Inefficiency and Delays",
                "The current Blue Route shuttle schedule fails to align with peak class dismissal times, resulting in extreme overcrowding and consistent 20+ minute delays during the 8 AM and 4 PM transit windows. Route optimization and additional buses are needed.",
                "anon_5102"
            );
            
            System.out.println("Seeded 5 fresh professional signals.");
            flag.createNewFile();
        }
    }
}
