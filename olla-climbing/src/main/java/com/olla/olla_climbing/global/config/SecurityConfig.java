package com.olla.olla_climbing.global.config;

import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import com.olla.olla_climbing.global.security.jwt.JwtAuthenticationFilter;
import com.olla.olla_climbing.global.security.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtTokenProvider jwtTokenProvider;
    private final MemberRepository memberRepository;

    private final Environment env;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 1. CSRF 보안 끄기
                .csrf(AbstractHttpConfigurer::disable)

                // 2. CORS 설정 적용
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // 3. 세션 관리 설정 (JWT 사용하므로 STATELESS)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // 4. 기본 로그인 폼 끄기
                .formLogin(AbstractHttpConfigurer::disable)

                // 5. HTTP Basic 인증 끄기
                .httpBasic(AbstractHttpConfigurer::disable)

                // 6. URL별 권한 설정
                // Swagger 규칙을 anyRequest() 앞으로 이동.
                .authorizeHttpRequests(auth -> auth
                        // 인증 없이 허용
                        .requestMatchers("/api/v1/auth/**").permitAll()

                        // Swagger: 운영(prod) 환경에서는 차단, 나머지는 허용
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**")
                        .access((authentication, ctx) -> {
                            boolean isProd = Arrays.asList(env.getActiveProfiles()).contains("prod");
                            return new AuthorizationDecision(!isProd);
                        })

                        // 관리자 API: ADMIN 권한 필수
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")

                        // 나머지 모든 요청: 로그인 필요
                        .anyRequest().authenticated()
                )

                // 7. JWT 필터 등록 (순환 참조 방지를 위해 직접 new로 생성)
                .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider, memberRepository),
                        UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // CORS 설정 Bean
    // 프론트엔드 도메인을 허용 목록에 추가합니다.
    // 운영 배포 시 allowedOrigins에 실제 프론트 도메인으로 교체하세요.
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // ── 테스트 시: 아래 줄 활성화, 배포 시: 주석 처리 ──
        config.setAllowedOriginPatterns(List.of("*"));

        // ── 배포 시: 아래 줄 활성화, 테스트 시: 주석 처리 ──
        // config.setAllowedOrigins(List.of(
        //         "http://localhost:3000",
        //         "http://localhost:8081",
        //         "https://ollagaja.com",
        //         "http://api.ollagaja.com:8080"
        // ));

        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(false);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}