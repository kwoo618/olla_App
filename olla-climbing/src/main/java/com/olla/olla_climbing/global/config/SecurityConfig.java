package com.olla.olla_climbing.global.config;

import com.olla.olla_climbing.global.security.jwt.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity // "이제부터 스프링 시큐리티가 웹 보안을 담당!"라고 선언합니다.
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    // SecurityFilterChain: 보안 규칙들의 모음입니다.
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 1. CSRF 보안 끄기
                // CSRF는 보통 세션 기반 웹(HTML)에서 필요한데, 우리는 API 서버(REST API)라서 끕니다.
                // 안 끄면 POST 요청 할 때마다 에러가 날 수 있습니다.
                .csrf(AbstractHttpConfigurer::disable)

                // 2. 세션 관리 설정 - JWT는 세션을 사용하지 않으므로 STATELESS로 설정합니다.
                // SessionCreationPolicy.STATELESS: "세션을 만들지 말고, 요청마다 인증 정보를 확인하라"는 뜻입니다. JWT는 토큰 기반 인증이기 때문에 서버에서 세션을 관리할 필요가 없습니다.
                .sessionManagement(session ->session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

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
                        // [Swagger 관련 주소]
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-resources/**").permitAll()

                        // [회원가입/로그인 주소]
                        .requestMatchers("/api/v1/auth/**").permitAll()

                        // [그 외 모든 주소] - 위에서 말한 것 빼고는 다 인증(로그인) 해야 들어갈 수 있다!
                        // .anyRequest().authenticated() // (지금은 개발 중이라 일단 주석 처리하거나 permitAll)
                        .anyRequest().permitAll()
                )

                // 5. JWT 인증 필터 추가
                // UsernamePasswordAuthenticationFilter보다 먼저 실행되도록 설정합니다. 이걸 추가해야 JWT 토큰이 있는 요청은 인증된 사용자로 처리됩니다.
                // jwtAuthenticationFilter: 우리가 만든 JWT 인증 필터입니다. 이 필터는 요청에서 JWT 토큰을 추출하고, 유효한 경우 SecurityContext에 인증 정보를 저장합니다.
                // UsernamePasswordAuthenticationFilter는 스프링 시큐리티에서 기본적으로 제공하는 필터로, 폼 로그인 방식에서 아이디/비번을 처리하는 필터입니다. JWT 인증 필터가 이보다 먼저 실행되어야 JWT 토큰이 있는 요청이 제대로 인증됩니다.
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder(){
        return new BCryptPasswordEncoder();
    }
}