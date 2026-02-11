package com.olla.olla_climbing;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@EnableJpaAuditing
@SpringBootApplication
public class OllaClimbingApplication {

	public static void main(String[] args) {
		SpringApplication.run(OllaClimbingApplication.class, args);
	}
}
