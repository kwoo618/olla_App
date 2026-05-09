package com.olla.olla_climbing;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableAsync
@EnableJpaAuditing
@EnableScheduling
@SpringBootApplication
public class OllaClimbingApplication {

	public static void main(String[] args) {
		SpringApplication.run(OllaClimbingApplication.class, args);
	}
}
