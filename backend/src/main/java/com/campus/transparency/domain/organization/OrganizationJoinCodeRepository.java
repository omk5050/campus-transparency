package com.campus.transparency.domain.organization;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OrganizationJoinCodeRepository extends JpaRepository<OrganizationJoinCode, Long> {

    Optional<OrganizationJoinCode> findByCode(String code);

    Optional<OrganizationJoinCode> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    Page<OrganizationJoinCode> findByOrganizationId(Long organizationId, Pageable pageable);

    Optional<OrganizationJoinCode> findByIdAndOrganizationId(Long id, Long organizationId);
}
