package com.olla.olla_climbing.global.config;

import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import com.olla.olla_climbing.global.security.jwt.JwtAuthenticationFilter;
import com.olla.olla_climbing.global.security.jwt.JwtTokenProvider;
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

    // 필터를 통째로 받지 말고, 필터가 필요로 하는 부품 2개를 받습니다!
    private final JwtTokenProvider jwtTokenProvider;
    private final MemberRepository memberRepository;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 1. CSRF 보안 끄기
                .csrf(AbstractHttpConfigurer::disable)

                // 2. 세션 관리 설정 (JWT 사용하므로 STATELESS)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // 3. 기본 로그인 폼 끄기
                .formLogin(AbstractHttpConfigurer::disable)

                // 4. HTTP Basic 인증 끄기
                .httpBasic(AbstractHttpConfigurer::disable)

                // 5. URL별 권한 설정
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/auth/**", "/swagger-ui/**", "/v3/api-docs/**").permitAll() // 열어둘 곳
                        .anyRequest().authenticated() // 나머지는 모두 인증 필요
                )

                // 6. JWT 필터를 여기서 직접 'new'로 생성해서 끼워 넣습니다. (순환 참조 원천 차단)
                .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider, memberRepository),
                        UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder(){
        return new BCryptPasswordEncoder();
    }
}