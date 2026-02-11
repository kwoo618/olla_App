package com.olla.olla_climbing.global.security.jwt;

import com.olla.olla_climbing.domain.member.dto.response.TokenResponse;
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

    private final long accessTokenValidity = 1000L * 60 * 60; // 토큰 유효 기간: 1시간
    private final long refreshTokenValidity = 1000L * 60 * 60 * 24 * 7; // 7일

    // 초기화: 서버가 켜질 때 비밀키를 디코딩해서 사용할 준비
    @PostConstruct      // PostConstruct 어노테이션은 의존성 주입이 완료된 후에 실행되는 메서드를 지정할 때 사용
    protected void init(){
        // 비밀 키 디코딩 (Base64 -> byte[]), application.yml에 Base64로 인코딩된 문자열이 저장되어 있다고 가정, 이를 byte 배열로 변환, 키 생성에 사용
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        this.key = Keys.hmacShaKeyFor(keyBytes);        // 비밀 키 생성
    }

    // 토큰 생성
    public TokenResponse createToken(String loginId) {

        Date now = new Date();
        Date accessTokenValidity = new Date(now.getTime() + this.accessTokenValidity);      // 액세스 토큰 만료 시간(현재 시간 + 엑세스 토큰 유효 기간(1시간))
        Date refreshTokenValidity = new Date(now.getTime() + this.refreshTokenValidity);    // 리프레시 토큰 만료 시간(현재 시간 + 리프레시 토큰 유효 기간(7일))

        // 액세스 토큰 생성
        String accessToken = Jwts.builder()
                .subject(loginId)       // 토큰의 주체를 로그인 ID로 설정
                .issuedAt(now)          // 토큰 발행 시간
                .expiration(accessTokenValidity)   // 액세스 토큰 만료 시간
                .signWith(key)          // 비밀 키로 서명
                .compact();             // 토큰 생성

        // 리프레시 토큰 생성: 보통은 리프레시 토큰에 추가 정보를 담지 않음
        String refreshToken = Jwts.builder()
                .expiration(refreshTokenValidity)   // 리프레시 토큰 만료 시간
                .signWith(key)          // 비밀 키로 서명
                .compact();             // 토큰 생성

        // 토큰 응답 DTO 생성 및 반환
        return TokenResponse.builder()
                .grantType("Bearer")    // 토큰 타입 설정
                .accessToken(accessToken)   // 액세스 토큰 설정
                .refreshToken(refreshToken) // 리프레시 토큰 설정
                .build();
    }

    // 토큰에서 로그인 ID 추출
    public String getLoginId(String token) {
        return Jwts.parser()
                .verifyWith(key)    // 비밀 키로 서명 검증
                .build()
                .parseSignedClaims(token)   // 토큰 파싱
                .getPayload()   // 페이로드(Claims)에서 로그인 ID 추출
                .getSubject();  // subject 필드 반환
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
