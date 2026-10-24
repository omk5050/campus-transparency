package com.campus.transparency.security;

import com.campus.transparency.domain.organization.Organization;
import com.campus.transparency.domain.user.User;
import com.campus.transparency.domain.user.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {

    private final UserRepository userRepository;

    public CurrentUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new AccessDeniedException("User is not authenticated");
        }
        String username = auth.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + username));
    }

    public Organization getCurrentOrganization() {
        User user = getCurrentUser();
        Organization org = user.getOrganization();
        if (org == null) {
            throw new AccessDeniedException("User does not belong to any organization");
        }
        return org;
    }

    public Long getCurrentOrganizationId() {
        return getCurrentOrganization().getId();
    }
}
