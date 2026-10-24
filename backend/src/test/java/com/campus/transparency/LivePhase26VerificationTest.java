package com.campus.transparency;

import com.campus.transparency.api.auth.LoginRequest;
import com.campus.transparency.api.auth.TokenResponse;
import com.campus.transparency.api.message.CreateIssueMessageRequest;
import com.campus.transparency.api.message.IssueMessageResponse;
import com.campus.transparency.api.message.UpdateIssueMessageRequest;
import com.campus.transparency.api.note.CreateInternalNoteRequest;
import com.campus.transparency.api.note.InternalNoteResponse;
import com.campus.transparency.api.note.UpdateInternalNoteRequest;
import com.campus.transparency.domain.audit.AuditLog;
import com.campus.transparency.domain.audit.AuditLogRepository;
import com.campus.transparency.domain.issue.Issue;
import com.campus.transparency.domain.issue.IssueRepository;
import com.campus.transparency.domain.organization.Organization;
import com.campus.transparency.domain.organization.OrganizationRepository;
import com.campus.transparency.domain.organization.OrganizationStatus;
import com.campus.transparency.domain.organization.OrganizationType;
import com.campus.transparency.domain.user.Role;
import com.campus.transparency.domain.user.User;
import com.campus.transparency.domain.user.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class LivePhase26VerificationTest {

    static {
        com.campus.transparency.config.DotenvLoader.load();
    }

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private IssueRepository issueRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("Execute Full Live HTTP Verification (Steps A-H)")
    void executeLiveHttpVerification() {
        String baseUrl = "http://localhost:" + port;
        long ts = System.currentTimeMillis();

        System.out.println("==================================================");
        System.out.println("STARTING LIVE PHASE 2.6 HTTP VERIFICATION");
        System.out.println("Base URL: " + baseUrl);
        System.out.println("==================================================");

        // Setup two live organizations
        Organization orgA = organizationRepository.save(new Organization(
                "Live Alpha Univ " + ts, OrganizationType.UNIVERSITY, OrganizationStatus.ACTIVE, "contact_a_" + ts + "@live.edu"));
        Organization orgB = organizationRepository.save(new Organization(
                "Live Beta College " + ts, OrganizationType.COLLEGE, OrganizationStatus.ACTIVE, "contact_b_" + ts + "@live.edu"));

        String rawPass = "LivePass123!Secure";
        String encodedPass = passwordEncoder.encode(rawPass);

        User adminA = userRepository.save(new User("live_adm_a_" + ts, encodedPass, Role.ADMIN, orgA));
        User invA = userRepository.save(new User("live_inv_a_" + ts, encodedPass, Role.ADMIN, orgA));
        User stuA = userRepository.save(new User("live_stu_a_" + ts, encodedPass, Role.STUDENT, orgA));

        User adminB = userRepository.save(new User("live_adm_b_" + ts, encodedPass, Role.ADMIN, orgB));
        User stuB = userRepository.save(new User("live_stu_b_" + ts, encodedPass, Role.STUDENT, orgB));

        Issue issueA = new Issue("Live Heating Leak " + ts, "Boiler rupture in dorm 4", "hash_" + ts, "Facilities", "Housing", orgA);
        issueA.assignTo(invA);
        issueA = issueRepository.save(issueA);

        Issue issueB = new Issue("Live Lab Fire " + ts, "Ventilation failure", "hash_b_" + ts, "Safety", "Lab", orgB);
        issueB = issueRepository.save(issueB);

        // A. Login as Organization A Admin
        ResponseEntity<TokenResponse> loginResA = restTemplate.postForEntity(
                baseUrl + "/api/auth/login", new LoginRequest(adminA.getUsername(), rawPass), TokenResponse.class);
        System.out.println("[Step A] Login Org A Admin: HTTP " + loginResA.getStatusCode().value());
        assertThat(loginResA.getStatusCode()).isEqualTo(HttpStatus.OK);
        String tokenA = loginResA.getBody().token();

        HttpHeaders headersA = new HttpHeaders();
        headersA.setBearerAuth(tokenA);
        headersA.setContentType(MediaType.APPLICATION_JSON);

        // B. Create / Read / Update / Delete Internal Note on Org A Issue
        // Create
        CreateInternalNoteRequest noteReq = new CreateInternalNoteRequest("Live note: Technician dispatched.");
        ResponseEntity<InternalNoteResponse> noteCreateRes = restTemplate.exchange(
                baseUrl + "/api/issues/" + issueA.getId() + "/internal-notes",
                HttpMethod.POST,
                new HttpEntity<>(noteReq, headersA),
                InternalNoteResponse.class
        );
        System.out.println("[Step B.1] Create Internal Note: HTTP " + noteCreateRes.getStatusCode().value() + " (ID: " + noteCreateRes.getBody().id() + ")");
        assertThat(noteCreateRes.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Long noteId = noteCreateRes.getBody().id();

        // Read
        ResponseEntity<InternalNoteResponse[]> noteReadRes = restTemplate.exchange(
                baseUrl + "/api/issues/" + issueA.getId() + "/internal-notes",
                HttpMethod.GET,
                new HttpEntity<>(headersA),
                InternalNoteResponse[].class
        );
        System.out.println("[Step B.2] Read Internal Notes: HTTP " + noteReadRes.getStatusCode().value() + ", count=" + noteReadRes.getBody().length);
        assertThat(noteReadRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(noteReadRes.getBody()).isNotEmpty();

        // Update
        UpdateInternalNoteRequest updateNoteReq = new UpdateInternalNoteRequest("Live note: Technician on site.");
        ResponseEntity<InternalNoteResponse> noteUpdateRes = restTemplate.exchange(
                baseUrl + "/api/issues/" + issueA.getId() + "/internal-notes/" + noteId,
                HttpMethod.PUT,
                new HttpEntity<>(updateNoteReq, headersA),
                InternalNoteResponse.class
        );
        System.out.println("[Step B.3] Update Internal Note: HTTP " + noteUpdateRes.getStatusCode().value());
        assertThat(noteUpdateRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(noteUpdateRes.getBody().content()).isEqualTo("Live note: Technician on site.");

        // C. Create / Read / Update / Delete Issue Message
        CreateIssueMessageRequest msgReq = new CreateIssueMessageRequest("Live msg: Please bring extra valves.");
        ResponseEntity<IssueMessageResponse> msgCreateRes = restTemplate.exchange(
                baseUrl + "/api/issues/" + issueA.getId() + "/messages",
                HttpMethod.POST,
                new HttpEntity<>(msgReq, headersA),
                IssueMessageResponse.class
        );
        System.out.println("[Step C.1] Create Message: HTTP " + msgCreateRes.getStatusCode().value() + " (ID: " + msgCreateRes.getBody().id() + ")");
        assertThat(msgCreateRes.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Long msgId = msgCreateRes.getBody().id();

        // Read
        ResponseEntity<IssueMessageResponse[]> msgReadRes = restTemplate.exchange(
                baseUrl + "/api/issues/" + issueA.getId() + "/messages",
                HttpMethod.GET,
                new HttpEntity<>(headersA),
                IssueMessageResponse[].class
        );
        System.out.println("[Step C.2] Read Messages: HTTP " + msgReadRes.getStatusCode().value() + ", count=" + msgReadRes.getBody().length);
        assertThat(msgReadRes.getStatusCode()).isEqualTo(HttpStatus.OK);

        // Update
        UpdateIssueMessageRequest updateMsgReq = new UpdateIssueMessageRequest("Live msg: Valves received.");
        ResponseEntity<IssueMessageResponse> msgUpdateRes = restTemplate.exchange(
                baseUrl + "/api/issues/" + issueA.getId() + "/messages/" + msgId,
                HttpMethod.PUT,
                new HttpEntity<>(updateMsgReq, headersA),
                IssueMessageResponse.class
        );
        System.out.println("[Step C.3] Update Message: HTTP " + msgUpdateRes.getStatusCode().value());
        assertThat(msgUpdateRes.getStatusCode()).isEqualTo(HttpStatus.OK);

        // D. Login as Org A Student: Confirm notes/messages inaccessible (HTTP 403)
        ResponseEntity<TokenResponse> loginResStu = restTemplate.postForEntity(
                baseUrl + "/api/auth/login", new LoginRequest(stuA.getUsername(), rawPass), TokenResponse.class);
        HttpHeaders headersStu = new HttpHeaders();
        headersStu.setBearerAuth(loginResStu.getBody().token());

        ResponseEntity<String> stuNoteRes = restTemplate.exchange(
                baseUrl + "/api/issues/" + issueA.getId() + "/internal-notes",
                HttpMethod.GET,
                new HttpEntity<>(headersStu),
                String.class
        );
        System.out.println("[Step D.1] Org A Student Access Notes: HTTP " + stuNoteRes.getStatusCode().value());
        assertThat(stuNoteRes.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        ResponseEntity<String> stuMsgRes = restTemplate.exchange(
                baseUrl + "/api/issues/" + issueA.getId() + "/messages",
                HttpMethod.GET,
                new HttpEntity<>(headersStu),
                String.class
        );
        System.out.println("[Step D.2] Org A Student Access Messages: HTTP " + stuMsgRes.getStatusCode().value());
        assertThat(stuMsgRes.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        // E. Login as Assigned Investigator (Org A): Confirm Access works
        ResponseEntity<TokenResponse> loginResInv = restTemplate.postForEntity(
                baseUrl + "/api/auth/login", new LoginRequest(invA.getUsername(), rawPass), TokenResponse.class);
        HttpHeaders headersInv = new HttpHeaders();
        headersInv.setBearerAuth(loginResInv.getBody().token());
        headersInv.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<InternalNoteResponse[]> invNoteRes = restTemplate.exchange(
                baseUrl + "/api/issues/" + issueA.getId() + "/internal-notes",
                HttpMethod.GET,
                new HttpEntity<>(headersInv),
                InternalNoteResponse[].class
        );
        System.out.println("[Step E.1] Assigned Investigator Read Notes: HTTP " + invNoteRes.getStatusCode().value());
        assertThat(invNoteRes.getStatusCode()).isEqualTo(HttpStatus.OK);

        // F. Login as Org B Admin: Attempt cross-tenant access to Org A (HTTP 404)
        ResponseEntity<TokenResponse> loginResB = restTemplate.postForEntity(
                baseUrl + "/api/auth/login", new LoginRequest(adminB.getUsername(), rawPass), TokenResponse.class);
        HttpHeaders headersB = new HttpHeaders();
        headersB.setBearerAuth(loginResB.getBody().token());
        headersB.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<String> bAccessNotes = restTemplate.exchange(
                baseUrl + "/api/issues/" + issueA.getId() + "/internal-notes",
                HttpMethod.GET,
                new HttpEntity<>(headersB),
                String.class
        );
        System.out.println("[Step F.1] Org B Admin Cross-Tenant Issue Notes: HTTP " + bAccessNotes.getStatusCode().value());
        assertThat(bAccessNotes.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        ResponseEntity<String> bAccessMessages = restTemplate.exchange(
                baseUrl + "/api/issues/" + issueA.getId() + "/messages",
                HttpMethod.GET,
                new HttpEntity<>(headersB),
                String.class
        );
        System.out.println("[Step F.2] Org B Admin Cross-Tenant Issue Messages: HTTP " + bAccessMessages.getStatusCode().value());
        assertThat(bAccessMessages.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        ResponseEntity<String> bAccessDirectNote = restTemplate.exchange(
                baseUrl + "/api/issues/" + issueA.getId() + "/internal-notes/" + noteId,
                HttpMethod.PUT,
                new HttpEntity<>(updateNoteReq, headersB),
                String.class
        );
        System.out.println("[Step F.3] Org B Admin Cross-Tenant Direct Note ID: HTTP " + bAccessDirectNote.getStatusCode().value());
        assertThat(bAccessDirectNote.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        // G. Verify Public Tracking & Public Detail contain NO notes or messages
        ResponseEntity<String> publicTrackingRes = restTemplate.getForEntity(
                baseUrl + "/api/issues/track/" + issueA.getTrackingCode(), String.class);
        System.out.println("[Step G.1] Public Tracking Response: HTTP " + publicTrackingRes.getStatusCode().value());
        assertThat(publicTrackingRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(publicTrackingRes.getBody()).doesNotContain("Live note");
        assertThat(publicTrackingRes.getBody()).doesNotContain("Live msg");
        assertThat(publicTrackingRes.getBody()).doesNotContain("internalNotes");
        assertThat(publicTrackingRes.getBody()).doesNotContain("messages");

        // H. Delete Note & Message, then verify Audit Log entries
        ResponseEntity<Void> deleteNoteRes = restTemplate.exchange(
                baseUrl + "/api/issues/" + issueA.getId() + "/internal-notes/" + noteId,
                HttpMethod.DELETE,
                new HttpEntity<>(headersA),
                Void.class
        );
        System.out.println("[Step H.1] Delete Internal Note: HTTP " + deleteNoteRes.getStatusCode().value());
        assertThat(deleteNoteRes.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        ResponseEntity<Void> deleteMsgRes = restTemplate.exchange(
                baseUrl + "/api/issues/" + issueA.getId() + "/messages/" + msgId,
                HttpMethod.DELETE,
                new HttpEntity<>(headersA),
                Void.class
        );
        System.out.println("[Step H.2] Delete Message: HTTP " + deleteMsgRes.getStatusCode().value());
        assertThat(deleteMsgRes.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        Long targetIssueId = issueA.getId();
        List<AuditLog> auditLogs = auditLogRepository.findAll().stream()
                .filter(l -> l.getIssue().getId().equals(targetIssueId))
                .toList();

        System.out.println("[Step H.3] Audit Log Count for Issue A: " + auditLogs.size());
        assertThat(auditLogs.stream().anyMatch(l -> l.getAction().equals("INTERNAL_NOTE_CREATED"))).isTrue();
        assertThat(auditLogs.stream().anyMatch(l -> l.getAction().equals("INTERNAL_NOTE_UPDATED"))).isTrue();
        assertThat(auditLogs.stream().anyMatch(l -> l.getAction().equals("INTERNAL_NOTE_DELETED"))).isTrue();
        assertThat(auditLogs.stream().anyMatch(l -> l.getAction().equals("ISSUE_MESSAGE_SENT"))).isTrue();
        assertThat(auditLogs.stream().anyMatch(l -> l.getAction().equals("ISSUE_MESSAGE_UPDATED"))).isTrue();
        assertThat(auditLogs.stream().anyMatch(l -> l.getAction().equals("ISSUE_MESSAGE_DELETED"))).isTrue();

        System.out.println("==================================================");
        System.out.println("LIVE PHASE 2.6 VERIFICATION COMPLETE — ALL STEPS PASSED");
        System.out.println("==================================================");
    }
}
