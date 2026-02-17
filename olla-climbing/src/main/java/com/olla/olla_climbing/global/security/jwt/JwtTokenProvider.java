package com.olla.olla_climbing.global.security.jwt;

import com.olla.olla_climbing.domain.auth.dto.response.TokenResponse;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Slf4j      // 로그를 남기기 위한 어노테이션
@Component
public class JwtTokenProvider {

    @Value("${jwt.secret}")     // application.yml에 설정된 비밀 키 값을 주입
    private String secretKey;

    private SecretKey key;  // 키 객체

    private final long accessTokenValidity = 1000L * 60 * 30; // 토큰 유효 기간: 30분
    private final long refreshTokenValidity = 1000L * 60 * 60 * 24 * 28; // 28일

    // 초기화: 서버가 켜질 때 비밀키를 디코딩해서 사용할 준비
    @PostConstruct      // PostConstruct 어노테이션은 의존성 주입이 완료된 후에 실행되는 메서드를 지정할 때 사용
    protected void init(){

        // 비밀 키 디코딩 (Base64 -> byte[]), application.yml에 Base64로 인코딩된 문자열이 저장되어 있다고 가정, 이를 byte 배열로 변환, 키 생성에 사용
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        this.key = Keys.hmacShaKeyFor(keyBytes);        // 비밀 키 생성
    }

    // Access Token 단독 생성
    public String createAccessToken(String loginId, String role) {
        Date now = new Date();
        Date validity = new Date(now.getTime() + this.accessTokenValidity);

        return Jwts.builder()
                .subject(loginId)   // 누구의 토큰인지 식별용
                .claim("role", role)    // 페이로드에 권한(role) 정보 추가
                .issuedAt(now)  // 토큰 발행 시간
                .expiration(validity)   // 토큰 만료 시간
                .signWith(key)  // 비밀 키로 서명
                .compact(); // JWT 토큰 생성
    }

    // Refresh Token 단독 생성 (권한 정보 없이 가볍게 생성)
    public String createRefreshToken(String loginId) {
        Date now = new Date();
        Date validity = new Date(now.getTime() + this.refreshTokenValidity);

        // Refresh Token은 Access Token보다 더 긴 유효 기간을 가지며, 권한 정보 없이 생성됩니다. 로그인 ID만 포함하여 토큰을 생성합니다.
        return Jwts.builder()
                .subject(loginId) // 누구의 토큰인지 식별용
                .issuedAt(now)
                .expiration(validity)
                .signWith(key)
                .compact();
    }

    // 토큰에서 로그인 ID 추출
    // 토큰이 만료된 경우에도 로그인 ID를 추출할 수 있도록 예외 처리
    public String getLoginId(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(key)    // 비밀 키로 서명 검증
                    .build()
                    .parseSignedClaims(token)   // 토큰 파싱
                    .getPayload()   // 페이로드(Claims)에서 로그인 ID 추출
                    .getSubject();  // subject 필드 반환
        } catch (ExpiredJwtException e) {
            // [핵심] 토큰이 만료되어 에러가 났더라도, 예외 객체(e) 안에 기존 페이로드 데이터가 남아있음!
            // 재발급(Reissue)을 위해 만료된 토큰에서도 아이디를 끄집어냄
            return e.getClaims().getSubject();
    }
    }

    // 토큰 검증
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(key)        // 비밀 키로 서명 검증
                    .build()
                    .parseSignedClaims(token);  // 토큰 파싱
            return true;    // 토큰이 유효하면 true 반환
        } catch (SecurityException | MalformedJwtException e) {     // SecurityException: 서명이 잘못된 경우, MalformedJwtException: 토큰 형식이 잘못된 경우
            log.info("잘못된 JWT 서명입니다.");
        } catch (ExpiredJwtException e) {       // ExpiredJwtException: 토큰이 만료된 경우
            log.info("만료된 JWT 토큰입니다.");
        } catch (UnsupportedJwtException e) {   // UnsupportedJwtException: 지원되지 않는 토큰인 경우
            log.info("지원되지 않는 JWT 토큰입니다.");
        } catch (IllegalArgumentException e) {  // IllegalArgumentException: 토큰이 비어있거나 잘못된 경우
            log.info("JWT 토큰이 잘못되었습니다.");
        }
        return false;   // 토큰이 유효하지 않으면 false 반환
    }
}
