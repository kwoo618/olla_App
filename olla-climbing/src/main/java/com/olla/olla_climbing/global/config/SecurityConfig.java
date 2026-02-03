package com.olla.olla_climbing.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

@Configuration // 스프링이 시작될 때 이 설정을 읽어들입니다.
@EnableWebSecurity // "이제부터 스프링 시큐리티가 웹 보안을 담당한다!"라고 선언합니다.
public class SecurityConfig {

    // SecurityFilterChain: 보안 규칙들의 모음입니다. (마치 경비원의 업무 수칙)
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 1. CSRF 보안 끄기
                // CSRF는 보통 세션 기반 웹(HTML)에서 필요한데, 우리는 API 서버(REST API)라서 끕니다.
                // 안 끄면 POST 요청 할 때마다 에러가 날 수 있습니다.
                .csrf(AbstractHttpConfigurer::disable)

                // 2. 기본 로그인 폼 끄기 (Form Login)
                // 이걸 켜두면 브라우저에서 들어갔을 때 촌스러운 기본 로그인 화면이 뜹니다.
                // 우리는 리액트/앱에서 로그인할 거라 필요 없습니다.
                .formLogin(AbstractHttpConfigurer::disable)

                // 3. HTTP Basic 인증 끄기
                // 브라우저 팝업창으로 아이디/비번 묻는 방식인데, 요즘은 잘 안 씁니다.
                .httpBasic(AbstractHttpConfigurer::disable)

                // 4. URL별 권한 설정 (가장 중요! ⭐)
                // requestMatchers: 특정 주소를 콕 집어서 설정합니다.
                // permitAll(): "묻지도 따지지도 말고 들여보내라" (누구나 접속 가능)
                .authorizeHttpRequests(auth -> auth
                        // [Swagger 관련 주소] - 여기는 개발자가 봐야 하니까 무조건 열어둡니다.
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-resources/**").permitAll()

                        // [회원가입/로그인 주소] - 로그인을 하러 오는 곳이니까 막으면 안 되겠죠?
                        .requestMatchers("/api/v1/auth/**").permitAll()

                        // [그 외 모든 주소] - 위에서 말한 것 빼고는 다 인증(로그인) 해야 들어갈 수 있다!
                        // .anyRequest().authenticated() // (지금은 개발 중이라 귀찮으니 일단 주석 처리하거나 permitAll 하셔도 됩니다)
                        .anyRequest().permitAll() // 일단 개발 편의를 위해 다 열어둘게요! 나중에 잠급니다.
                );

        return http.build();
    }
}