package com.olla.olla_climbing.global.security.jwt;

import com.olla.olla_climbing.domain.member.Member;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

@Slf4j      // 로그를 남기기 위한 어노테이션
@Component
@RequiredArgsConstructor    // final로 선언된 필드를 매개변수로 받는 생성자를 자동 생성
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;    // JWT 토큰을 생성하고 검증하는 컴포넌트
    private final MemberRepository memberRepository;    // 회원 정보를 조회하는 리포지토리

    // 요청이 들어올 때마다 실행되는 필터 메서드
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        // doFilterInternal: 실제로 요청이 들어올 때마다 실행되는 메서드입니다. 여기서 JWT 토큰을 검증하고, 유효한 경우 SecurityContext에 인증 정보를 저장합니다.
        // HttpServletRequest: 클라이언트의 요청 정보를 담고 있는 객체입니다. 여기서 헤더에서 토큰을 추출합니다.
        // HttpServletResponse: 서버가 클라이언트에게 응답할 때 사용하는 객체
        // FilterChain: 여러 필터가 체인 형태로 연결되어 있을 때, 다음 필터로 요청을 전달하는 역할을 합니다.

        // 1. 요청에서 JWT 토큰 추출
        String token = resolveToken(request);

        // 2. 토큰이 존재하고 유효한 경우
        if (token != null && jwtTokenProvider.validateToken(token)){
            // 3. 토큰에서 로그인 ID 추출
            String loginId = jwtTokenProvider.getLoginId(token);

            Member member = memberRepository.findByLoginId(loginId)
                    .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 토큰입니다."));

            // 4. 인증 객체 생성 (Spring Security에서 사용)
            Authentication authentication = new UsernamePasswordAuthenticationToken(
                    member,
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_USER"))
            );

            // 5. SecurityContext에 인증 정보 저장
            SecurityContextHolder.getContext().setAuthentication(authentication);
            log.info("Security Context에 '{}' 인증 정보를 저장했습니다.", loginId);
        }

        // 6. 다음 필터로 요청 전달
        filterChain.doFilter(request, response);
    }

    // 요청에서 "Authorization" 헤더에서 JWT 토큰을 추출하는 메서드
    private String resolveToken(HttpServletRequest request){

        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);    // "Bearer " 접두어를 제거하고 실제 토큰 부분만 반환, 예: "Bearer abcdefg" -> "abcdefg"
        }
        return null;
    }
}
