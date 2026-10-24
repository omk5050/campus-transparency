package com.campus.transparency;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class CampusTransparencyApplicationTests {

	static {
		com.campus.transparency.config.DotenvLoader.load();
	}

	@Test
	void contextLoads() {
	}

}
