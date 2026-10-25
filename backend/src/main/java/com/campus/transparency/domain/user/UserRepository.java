package com.campus.transparency.domain.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    java.util.List<User> findByRole(Role role);
    java.util.List<User> findByRoleAndOrganizationId(Role role, Long organizationId);
    java.util.List<User> findByRoleIn(java.util.Collection<Role> roles);
    java.util.List<User> findByRoleInAndOrganizationId(java.util.Collection<Role> roles, Long organizationId);
    Optional<User> findByIdAndOrganizationId(Long id, Long organizationId);
    boolean existsByUsernameIgnoreCase(String username);
}
