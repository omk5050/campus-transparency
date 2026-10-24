package com.campus.transparency;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class CampusTransparencyApplication {

	static {
		com.campus.transparency.config.DotenvLoader.load();
	}

	public static void main(String[] args) {
		SpringApplication.run(CampusTransparencyApplication.class, args);
	}

}
