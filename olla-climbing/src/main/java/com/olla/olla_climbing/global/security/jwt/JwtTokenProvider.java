package com.olla.olla_climbing.global.security.jwt;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;

@Slf4j
@Service
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String secretKey;

    private SecretKey key;

    private static final long ACCESS_TOKEN_VALIDITY  = 1000L * 60 * 30;         // 30분
    private static final long REFRESH_TOKEN_VALIDITY = 1000L * 60 * 60 * 24 * 28;   // 28일
    private static final long QR_TOKEN_VALIDITY      = 1000L * 60 * 3;          // 3분

    @PostConstruct
    protected void init() {
        this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secretKey));
    }

    public String createAccessToken(String loginId, String role) {
        return buildToken(loginId, ACCESS_TOKEN_VALIDITY)
                .claim("role", role)
                .compact();
    }

    public String createRefreshToken(String loginId) {
        return buildToken(loginId, REFRESH_TOKEN_VALIDITY).compact();
    }

    public String createQrToken(String loginId) {
        return buildToken(loginId, QR_TOKEN_VALIDITY)
                .claim("type", "QR")
                .compact();
    }

    public String getLoginId(String token) {
        try {
            return parseClaims(token).getSubject();
        } catch (ExpiredJwtException e) {
            // 만료된 토큰에서도 loginId 추출 가능 (재발급 시 사용)
            return e.getClaims().getSubject();
        }
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (SecurityException | MalformedJwtException e) {
            log.info("잘못된 JWT 서명: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            log.info("만료된 JWT 토큰: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.info("지원되지 않는 JWT 토큰: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.info("JWT 토큰 값 오류: {}", e.getMessage());
        }
        return false;
    }

    // ── private 헬퍼 ─────────────────────────────────────────────

    private JwtBuilder buildToken(String loginId, long validity) {
        Date now = new Date();
        return Jwts.builder()
                .subject(loginId)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + validity))
                .signWith(key);
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}