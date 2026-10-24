package com.campus.transparency.domain.organization;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OrganizationApplicationRepository extends JpaRepository<OrganizationApplication, Long> {

    boolean existsByOrganizationNameIgnoreCaseAndStatus(String organizationName, ApplicationStatus status);

    boolean existsByOfficialEmailIgnoreCaseAndStatus(String officialEmail, ApplicationStatus status);

    boolean existsByRequestedAdminUsernameIgnoreCaseAndStatus(String requestedAdminUsername, ApplicationStatus status);

    Page<OrganizationApplication> findByStatus(ApplicationStatus status, Pageable pageable);
}
