package com.olla.olla_climbing.domain.admin.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum MembershipType {
    PERIOD("회원권"), // 기간권(1개월, 3개월, 6개월 등)
    COUNT("일일권");  // 횟수권(10회권 등)

    private final String description; // 구글 시트에 전송될 한글 이름
}