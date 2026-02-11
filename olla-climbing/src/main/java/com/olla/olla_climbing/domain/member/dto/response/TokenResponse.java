package com.olla.olla_climbing.domain.member.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder    // 빌더 패턴 자동 생성
@AllArgsConstructor // 모든 필드를 매개변수로 받는 생성자 자동 생성
public class TokenResponse {
    // 토큰 응답 DTO

    private String grantType;       // 토큰 타입
    private String accessToken;     // 액세스 토큰
    private String refreshToken;    // 리프레시 토큰 추가
}
