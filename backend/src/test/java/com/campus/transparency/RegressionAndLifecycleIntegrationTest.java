package com.campus.transparency;

import com.campus.transparency.api.auth.LoginRequest;
import com.campus.transparency.api.issue.AssignIssueRequest;
import com.campus.transparency.api.issue.CreateIssueRequest;
import com.campus.transparency.domain.issue.IssueStatus;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.campus.transparency.testconfig.IsolatedTestDatabase;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@IsolatedTestDatabase
@Transactional
public class RegressionAndLifecycleIntegrationTest {

    static {
        com.campus.transparency.config.DotenvLoader.load();
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String loginAndGetToken(String username, String password) throws Exception {
        LoginRequest loginRequest = new LoginRequest(username, password);
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode jsonNode = objectMapper.readTree(result.getResponse().getContentAsString());
        return jsonNode.get("token").asText();
    }

    @Test
    void fullPhase1AndPhase2RegressionSuite() throws Exception {
        // 1. Login verification
        String studentToken = loginAndGetToken("student", "student123");
        String adminToken = loginAndGetToken("admin", "admin123");
        String investigatorToken = loginAndGetToken("investigator", "investigator123");

        assertThat(studentToken).isNotBlank();
        assertThat(adminToken).isNotBlank();
        assertThat(investigatorToken).isNotBlank();

        // 2. Student creates issue with category and department (Phase 2.1)
        CreateIssueRequest createReq = new CreateIssueRequest(
                "Regression Testing Campus Heating",
                "Detailed description of heating failure in block B",
                "student_anon_hash_99",
                "Infrastructure",
                "Facilities & Operations"
        );

        MvcResult createResult = mockMvc.perform(post("/api/issues")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.trackingCode").exists())
                .andExpect(jsonPath("$.category").value("Infrastructure"))
                .andExpect(jsonPath("$.department").value("Facilities & Operations"))
                .andReturn();

        JsonNode createdJson = objectMapper.readTree(createResult.getResponse().getContentAsString());
        long issueId = createdJson.get("id").asLong();
        String trackingCode = createdJson.get("trackingCode").asText();

        // 3. Issue detail lookup via public tracking code
        mockMvc.perform(get("/api/issues/track/" + trackingCode))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(issueId))
                .andExpect(jsonPath("$.trackingCode").value(trackingCode));

        // 4. Issue detail lookup via GET /api/issues/{id}
        mockMvc.perform(get("/api/issues/" + issueId)
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(issueId))
                .andExpect(jsonPath("$.title").value("Regression Testing Campus Heating"));

        // 5. Voting (upvote, downvote, vote delta)
        mockMvc.perform(post("/api/issues/" + issueId + "/upvote")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/issues/" + issueId + "/downvote")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/issues/" + issueId + "/vote")
                        .param("delta", "2")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isNoContent());

        // 6. Admin case assignment & department routing (Phase 2.2)
        // First get assignees to find investigator ID
        MvcResult assigneesResult = mockMvc.perform(get("/api/issues/assignees")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode assignees = objectMapper.readTree(assigneesResult.getResponse().getContentAsString());
        long investigatorId = -1;
        for (JsonNode node : assignees) {
            if ("investigator".equals(node.get("username").asText())) {
                investigatorId = node.get("id").asLong();
                break;
            }
        }
        assertThat(investigatorId).isGreaterThan(0);

        // Assign investigator and route to Campus Safety
        AssignIssueRequest assignReq = new AssignIssueRequest(investigatorId, "Campus Safety");
        mockMvc.perform(post("/api/issues/" + issueId + "/assign")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(assignReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignedTo.id").value(investigatorId))
                .andExpect(jsonPath("$.department").value("Campus Safety"));

        // 7. Verify assignment on GET detail view
        mockMvc.perform(get("/api/issues/" + issueId)
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignedTo.id").value(investigatorId))
                .andExpect(jsonPath("$.department").value("Campus Safety"));

        // 8. Lifecycle transitions: start -> resolve
        mockMvc.perform(post("/api/issues/" + issueId + "/start")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/issues/" + issueId)
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(IssueStatus.IN_PROGRESS.name()));

        mockMvc.perform(post("/api/issues/" + issueId + "/resolve")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/issues/" + issueId)
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(IssueStatus.RESOLVED.name()));

        // 9. Hide issue (moderation)
        mockMvc.perform(post("/api/issues/" + issueId + "/hide")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        // Public feed excludes hidden issue
        mockMvc.perform(get("/api/issues")
                        .param("size", "100")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.[?(@.id == " + issueId + ")]").doesNotExist());

        // Admin feed includes hidden issue
        mockMvc.perform(get("/api/issues/admin")
                        .param("size", "2000")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.[?(@.id == " + issueId + ")]").exists());

        // 10. Admin unassigns
        mockMvc.perform(post("/api/issues/" + issueId + "/unassign")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignedTo").doesNotExist());

        // 11. Audit logs verify actions
        mockMvc.perform(get("/api/admin/audit")
                        .param("size", "100")
                        .param("sort", "createdAt,desc")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.[?(@.action == 'ISSUE_ASSIGNED')]").exists())
                .andExpect(jsonPath("$.content.[?(@.action == 'ISSUE_UNASSIGNED')]").exists());
    }
}
