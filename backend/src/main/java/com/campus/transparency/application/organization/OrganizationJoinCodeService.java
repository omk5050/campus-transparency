package com.campus.transparency.application.organization;

import com.campus.transparency.api.auth.RegisterRequest;
import com.campus.transparency.api.organization.CreateJoinCodeRequest;
import com.campus.transparency.api.organization.JoinCodeResponse;
import com.campus.transparency.api.organization.ValidateJoinCodeResponse;
import com.campus.transparency.domain.organization.*;
import com.campus.transparency.domain.user.Role;
import com.campus.transparency.domain.user.User;
import com.campus.transparency.domain.user.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;

@Service
public class OrganizationJoinCodeService {

    private static final String CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final OrganizationJoinCodeRepository joinCodeRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public OrganizationJoinCodeService(
            OrganizationJoinCodeRepository joinCodeRepository,
            OrganizationRepository organizationRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.joinCodeRepository = joinCodeRepository;
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public JoinCodeResponse createJoinCode(CreateJoinCodeRequest request, User currentUser) {
        if (request.targetRole() == Role.SUPER_ADMIN) {
            throw new IllegalArgumentException("Cannot generate join codes for SUPER_ADMIN role");
        }

        Organization targetOrg;
        if (currentUser.getRole() == Role.SUPER_ADMIN) {
            if (request.organizationId() == null) {
                throw new IllegalArgumentException("Organization ID is required when creating join codes as SUPER_ADMIN");
            }
            targetOrg = organizationRepository.findById(request.organizationId())
                    .orElseThrow(() -> new EntityNotFoundException("Organization not found: " + request.organizationId()));
        } else {
            targetOrg = currentUser.getOrganization();
            if (targetOrg == null) {
                throw new IllegalStateException("Current user does not belong to an organization");
            }
        }

        if (targetOrg.getStatus() != OrganizationStatus.ACTIVE) {
            throw new IllegalStateException("Cannot create join codes for an inactive or suspended organization");
        }

        String generatedCode = generateUniqueCode(request.customPrefix(), request.targetRole());

        Instant expiresAt = null;
        if (request.expiresInDays() != null && request.expiresInDays() > 0) {
            expiresAt = Instant.now().plus(Duration.ofDays(request.expiresInDays()));
        }

        OrganizationJoinCode joinCode = new OrganizationJoinCode(
                generatedCode,
                targetOrg,
                request.targetRole(),
                currentUser.getUsername(),
                request.maxUses(),
                expiresAt
        );

        OrganizationJoinCode saved = joinCodeRepository.save(joinCode);
        return JoinCodeResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public Page<JoinCodeResponse> getJoinCodes(User currentUser, Long specificOrgId, Pageable pageable) {
        Long orgId;
        if (currentUser.getRole() == Role.SUPER_ADMIN) {
            orgId = specificOrgId;
            if (orgId == null) {
                return joinCodeRepository.findAll(pageable).map(JoinCodeResponse::from);
            }
        } else {
            if (currentUser.getOrganization() == null) {
                throw new IllegalStateException("Current user does not belong to an organization");
            }
            orgId = currentUser.getOrganization().getId();
        }

        return joinCodeRepository.findByOrganizationId(orgId, pageable)
                .map(JoinCodeResponse::from);
    }

    @Transactional
    public JoinCodeResponse revokeJoinCode(Long id, User currentUser) {
        OrganizationJoinCode joinCode;
        if (currentUser.getRole() == Role.SUPER_ADMIN) {
            joinCode = joinCodeRepository.findById(id)
                    .orElseThrow(() -> new EntityNotFoundException("Join code not found: " + id));
        } else {
            if (currentUser.getOrganization() == null) {
                throw new IllegalStateException("Current user does not belong to an organization");
            }
            joinCode = joinCodeRepository.findByIdAndOrganizationId(id, currentUser.getOrganization().getId())
                    .orElseThrow(() -> new EntityNotFoundException("Join code not found: " + id));
        }

        if (joinCode.isRevoked()) {
            throw new IllegalStateException("Join code is already revoked");
        }

        joinCode.revoke(currentUser.getUsername());
        OrganizationJoinCode saved = joinCodeRepository.save(joinCode);
        return JoinCodeResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public ValidateJoinCodeResponse validateJoinCode(String rawCode) {
        if (rawCode == null || rawCode.trim().isEmpty()) {
            return new ValidateJoinCodeResponse(false, null, null, null, null, null, null, "Join code cannot be empty");
        }

        var opt = joinCodeRepository.findByCodeIgnoreCase(rawCode.trim());
        if (opt.isEmpty()) {
            return new ValidateJoinCodeResponse(false, rawCode.trim(), null, null, null, null, null, "Join code does not exist");
        }

        OrganizationJoinCode code = opt.get();
        if (code.isRevoked()) {
            return new ValidateJoinCodeResponse(false, code.getCode(), code.getOrganization().getId(),
                    code.getOrganization().getName(), code.getOrganization().getOrganizationType().name(),
                    code.getTargetRole(), code.getExpiresAt(), "Join code has been revoked");
        }
        if (code.isExpired()) {
            return new ValidateJoinCodeResponse(false, code.getCode(), code.getOrganization().getId(),
                    code.getOrganization().getName(), code.getOrganization().getOrganizationType().name(),
                    code.getTargetRole(), code.getExpiresAt(), "Join code has expired");
        }
        if (code.isExhausted()) {
            return new ValidateJoinCodeResponse(false, code.getCode(), code.getOrganization().getId(),
                    code.getOrganization().getName(), code.getOrganization().getOrganizationType().name(),
                    code.getTargetRole(), code.getExpiresAt(), "Join code usage limit has been reached");
        }
        if (code.getOrganization().getStatus() != OrganizationStatus.ACTIVE) {
            return new ValidateJoinCodeResponse(false, code.getCode(), code.getOrganization().getId(),
                    code.getOrganization().getName(), code.getOrganization().getOrganizationType().name(),
                    code.getTargetRole(), code.getExpiresAt(), "Organization is currently inactive");
        }

        return new ValidateJoinCodeResponse(
                true,
                code.getCode(),
                code.getOrganization().getId(),
                code.getOrganization().getName(),
                code.getOrganization().getOrganizationType().name(),
                code.getTargetRole(),
                code.getExpiresAt(),
                "Join code is valid"
        );
    }

    @Transactional
    public User registerWithJoinCode(RegisterRequest request) {
        String username = request.username().trim();
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new IllegalArgumentException("Username '" + username + "' is already taken");
        }

        String rawCode = request.joinCode().trim();
        OrganizationJoinCode code = joinCodeRepository.findByCodeIgnoreCase(rawCode)
                .orElseThrow(() -> new IllegalArgumentException("Invalid join code: " + rawCode));

        if (code.isRevoked()) {
            throw new IllegalStateException("Join code has been revoked");
        }
        if (code.isExpired()) {
            throw new IllegalStateException("Join code has expired");
        }
        if (code.isExhausted()) {
            throw new IllegalStateException("Join code has reached its maximum usage limit");
        }
        if (code.getOrganization().getStatus() != OrganizationStatus.ACTIVE) {
            throw new IllegalStateException("Organization is not active");
        }

        User newUser = new User(
                username,
                passwordEncoder.encode(request.password()),
                code.getTargetRole(),
                code.getOrganization()
        );

        User savedUser = userRepository.save(newUser);
        code.recordUsage();
        joinCodeRepository.save(code);

        return savedUser;
    }

    private String generateUniqueCode(String customPrefix, Role role) {
        String rolePrefix = (role == Role.ADMIN) ? "ADM" : "STU";
        String prefix = (customPrefix != null && !customPrefix.trim().isEmpty())
                ? customPrefix.trim().toUpperCase().replaceAll("[^A-Z0-9]", "") + "-" + rolePrefix
                : "ETHOS-" + rolePrefix;

        for (int attempt = 0; attempt < 10; attempt++) {
            StringBuilder sb = new StringBuilder(prefix).append("-");
            for (int i = 0; i < 6; i++) {
                sb.append(CODE_CHARS.charAt(RANDOM.nextInt(CODE_CHARS.length())));
            }
            String candidate = sb.toString();
            if (!joinCodeRepository.existsByCodeIgnoreCase(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Failed to generate a unique join code; please try again");
    }
}
