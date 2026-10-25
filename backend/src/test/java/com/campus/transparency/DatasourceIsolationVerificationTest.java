package com.campus.transparency;

import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import javax.sql.DataSource;
import java.sql.Connection;

import static org.assertj.core.api.Assertions.assertThat;

import com.campus.transparency.testconfig.IsolatedTestDatabase;

@SpringBootTest
@IsolatedTestDatabase
public class DatasourceIsolationVerificationTest {

    @Autowired
    private DataSource dataSource;

    @Test
    @DisplayName("Verify that test context uses isolated embedded PostgreSQL and NOT production Neon")
    void verifyTestDatasourceIsIsolated() throws Exception {
        assertThat(dataSource).isNotNull();
        try (Connection conn = dataSource.getConnection()) {
            String url = conn.getMetaData().getURL();
            System.out.println("TEST DATASOURCE CONNECTED TO: " + url);
            assertThat(url).doesNotContain("neon.tech");
            assertThat(url).doesNotContain("ep-mute-unit-a14szfx7");
            assertThat(url).contains("localhost");
        }
    }
}
