package com.campus.transparency.domain.organization;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OrganizationRepository extends JpaRepository<Organization, Long> {
    Optional<Organization> findByName(String name);
    boolean existsByNameIgnoreCase(String name);
    boolean existsByOfficialEmailIgnoreCase(String officialEmail);
    long countByStatus(OrganizationStatus status);
    java.util.List<Organization> findByStatus(OrganizationStatus status);
}
