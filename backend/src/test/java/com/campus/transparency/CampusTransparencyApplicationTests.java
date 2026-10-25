package com.campus.transparency;

import com.campus.transparency.testconfig.IsolatedTestDatabase;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@IsolatedTestDatabase
class CampusTransparencyApplicationTests {

	static {
		com.campus.transparency.config.DotenvLoader.load();
	}

	@Test
	void contextLoads() {
	}

}
