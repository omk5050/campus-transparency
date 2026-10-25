package com.campus.transparency.testconfig;

import org.springframework.test.context.TestContext;
import org.springframework.test.context.support.AbstractTestExecutionListener;

import javax.sql.DataSource;
import java.sql.Connection;

public class ProductionDatabaseGuardListener extends AbstractTestExecutionListener {

    @Override
    public int getOrder() {
        return Integer.MIN_VALUE;
    }

    @Override
    public void prepareTestInstance(TestContext testContext) throws Exception {
        validateDataSource(testContext);
    }

    @Override
    public void beforeTestMethod(TestContext testContext) throws Exception {
        validateDataSource(testContext);
    }

    private void validateDataSource(TestContext testContext) {
        org.springframework.core.env.Environment env = testContext.getApplicationContext().getEnvironment();
        String envUrl = env.getProperty("spring.datasource.url");
        if (envUrl != null) {
            String lowerEnv = envUrl.toLowerCase();
            if (lowerEnv.contains("neon.tech") || lowerEnv.contains("ep-mute-unit-a14szfx7") || (lowerEnv.contains("neondb") && lowerEnv.contains("aws"))) {
                throw new IllegalStateException(
                    "CRITICAL SECURITY VIOLATION: Test environment property 'spring.datasource.url' resolved to production Neon database: " + envUrl +
                    ". Aborting execution immediately."
                );
            }
        }

        if (!testContext.getApplicationContext().containsBean("dataSource")) {
            return;
        }
        try {
            DataSource ds = testContext.getApplicationContext().getBean(DataSource.class);
            try (Connection conn = ds.getConnection()) {
                String url = conn.getMetaData().getURL();
                if (url != null) {
                    String lower = url.toLowerCase();
                    if (lower.contains("neon.tech") || 
                        lower.contains("ep-mute-unit-a14szfx7") ||
                        (lower.contains("neondb") && lower.contains("aws"))) {
                        throw new IllegalStateException(
                            "CRITICAL SECURITY VIOLATION: Test execution connected to production Neon database: " + url +
                            ". Aborting execution immediately."
                        );
                    }
                }
            }
        } catch (IllegalStateException ise) {
            throw ise;
        } catch (Exception ignored) {
        }
    }
}
