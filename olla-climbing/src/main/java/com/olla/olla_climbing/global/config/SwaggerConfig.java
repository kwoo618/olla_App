package com.olla.olla_climbing.global.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

// @Configuration: 스프링에게 "이 클래스는 설정 파일이야!"라고 알려주는 어노테이션입니다.
// 이걸 붙여야 스프링이 시작될 때 이 파일을 읽어서 설정을 적용합니다.
@Configuration
public class SwaggerConfig {

    // @Bean: 스프링 컨테이너(상자)에 이 객체를 등록하라는 뜻입니다.
    // 이렇게 등록해두면 스프링이 알아서 Swagger를 실행할 때 이 정보를 가져다 씁니다.
    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("OLLA Climbing API Docs") // 문서 제목
                        .description("olla 클라이밍 센터 API 명세서입니다.\n- 최강우 -") // 문서 설명
                        .version("v1.0.0")); // API 버전
    }
}