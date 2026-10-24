package com.campus.transparency.api.auth;

import com.campus.transparency.api.organization.ValidateJoinCodeResponse;
import com.campus.transparency.application.organization.OrganizationJoinCodeService;
import com.campus.transparency.domain.user.User;
import com.campus.transparency.security.CurrentUserService;
import com.campus.transparency.security.JwtUtil;
import jakarta.validation.Valid;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final JwtUtil jwtUtil;
    private final CurrentUserService currentUserService;
    private final OrganizationJoinCodeService joinCodeService;

    public AuthController(
            AuthenticationManager authenticationManager,
            UserDetailsService userDetailsService,
            JwtUtil jwtUtil,
            CurrentUserService currentUserService,
            OrganizationJoinCodeService joinCodeService
    ) {
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.jwtUtil = jwtUtil;
        this.currentUserService = currentUserService;
        this.joinCodeService = joinCodeService;
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );

        final UserDetails userDetails = userDetailsService.loadUserByUsername(request.username());
        final String jwt = jwtUtil.generateToken(userDetails);

        return new TokenResponse(jwt);
    }

    @PostMapping("/register")
    public TokenResponse register(@Valid @RequestBody RegisterRequest request) {
        User registeredUser = joinCodeService.registerWithJoinCode(request);

        final UserDetails userDetails = userDetailsService.loadUserByUsername(registeredUser.getUsername());
        final String jwt = jwtUtil.generateToken(userDetails);

        return new TokenResponse(jwt);
    }

    @GetMapping("/join-codes/{code}/validate")
    public ValidateJoinCodeResponse validateJoinCode(@PathVariable String code) {
        return joinCodeService.validateJoinCode(code);
    }

    @GetMapping("/me")
    public UserProfileResponse me() {
        User user = currentUserService.getCurrentUser();
        OrganizationSummaryResponse orgSummary = null;
        if (user.getOrganization() != null) {
            orgSummary = new OrganizationSummaryResponse(
                    user.getOrganization().getId(),
                    user.getOrganization().getName(),
                    user.getOrganization().getOrganizationType().name()
            );
        }
        return new UserProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getRole().name(),
                orgSummary
        );
    }

    public record OrganizationSummaryResponse(Long id, String name, String type) {}
    public record UserProfileResponse(Long id, String username, String role, OrganizationSummaryResponse organization) {}
}

