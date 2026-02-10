package com.olla.olla_climbing.domain.member;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor    // final로 선언된 필드를 매개변수로 받는 생성자를 자동 생성
public enum Role {
    USER("ROLE_USER","일반 사용자"), ADMIN("ROLE_ADMIN","관리자");

    private final String key;
    private final String title;
}