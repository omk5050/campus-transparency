package com.campus.transparency.domain.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    java.util.List<User> findByRole(Role role);
    java.util.List<User> findByRoleAndOrganizationId(Role role, Long organizationId);
    Optional<User> findByIdAndOrganizationId(Long id, Long organizationId);
}
