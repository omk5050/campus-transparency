package com.campus.transparency;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.campus.transparency.testconfig.IsolatedTestDatabase;

@SpringBootTest
@AutoConfigureMockMvc
@IsolatedTestDatabase
public class HealthEndpointIntegrationTest {

    static {
        com.campus.transparency.config.DotenvLoader.load();
    }

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /api/health returns HTTP 200 without authentication and minimal status payload")
    void healthCheckReturns200WithoutAuth() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andReturn();

        String content = result.getResponse().getContentAsString();
        // Verify response contains only status and no sensitive data
        assertThat(content).contains("UP");
        assertThat(content.toLowerCase())
                .doesNotContain("password")
                .doesNotContain("secret")
                .doesNotContain("database")
                .doesNotContain("cloudinary")
                .doesNotContain("token");
    }

    @Test
    @DisplayName("GET /api/health bypasses Bucket4j unauthenticated rate limits (10 req/min limit)")
    void healthCheckBypassesRateLimiting() throws Exception {
        // Send 25 consecutive requests from unauthenticated client
        for (int i = 0; i < 25; i++) {
            mockMvc.perform(get("/api/health"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("UP"));
        }
    }

    @Test
    @DisplayName("Protected endpoints still require authentication")
    void protectedEndpointsStillRequireAuth() throws Exception {
        mockMvc.perform(get("/api/issues"))
                .andExpect(status().isForbidden());
    }
}
