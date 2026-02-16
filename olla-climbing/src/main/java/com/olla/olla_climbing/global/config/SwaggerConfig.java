package com.olla.olla_climbing.global.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;

// @Configuration: 스프링에게 "이 클래스는 설정 파일이야!"라고 알려주는 어노테이션입니다.
// 이걸 붙여야 스프링이 시작될 때 이 파일을 읽어서 설정을 적용합니다.
@Configuration
public class SwaggerConfig {

    // @Bean: 스프링 컨테이너(상자)에 이 객체를 등록하라는 뜻입니다.
    // 이렇게 등록해두면 스프링이 알아서 Swagger를 실행할 때 이 정보를 가져다 씁니다.
    @Bean
    public OpenAPI openAPI() {

        // 1. 보안 스키마(JWT 토큰 자물쇠) 정의
        SecurityScheme securityScheme = new SecurityScheme()
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT")
                .in(SecurityScheme.In.HEADER)
                .name("Authorization");

        // 2. 이 자물쇠를 모든 API에 기본으로 적용하겠다는 설정
        SecurityRequirement securityRequirement = new SecurityRequirement().addList("bearerAuth");

        return new OpenAPI()
                .info(new Info()
                        .title("OLLA Climbing API Docs") // 문서 제목
                        .description("olla 클라이밍 센터 API 명세서입니다.\n- 최강우 -") // 문서 설명
                        .version("v1.0.0")) // API 버전
                // 3. 위에서 만든 자물쇠(스키마)와 요구사항을 OpenAPI에 등록
                .components(new Components().addSecuritySchemes("bearerAuth", securityScheme))
                .addSecurityItem(securityRequirement);
    }
}