package com.campus.transparency.api.auth;

import com.campus.transparency.application.auth.JwtService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtService jwtService;

    public AuthController(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody Map<String, String> request) {

        String username = request.get("username");
        String role = request.get("role");

        // TEMP: no DB validation yet
        String token = jwtService.generateToken(username, role);

        return Map.of("token", token);
    }
}