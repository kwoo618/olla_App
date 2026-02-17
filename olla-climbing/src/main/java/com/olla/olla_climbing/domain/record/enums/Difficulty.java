package com.olla.olla_climbing.domain.record.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum Difficulty {
    WHITE(26, 10),   // 흰색: 기초점수 10점
    YELLOW(33, 20),  // 노랑: 기초점수 20점
    GREEN(28, 30),   // 초록: 기초점수 30점
    BLUE(26, 40),    // 파랑: 기초점수 40점
    RED(26, 50),     // 빨강: 기초점수 50점
    PURPLE(25, 60),  // 보라: 기초점수 60점
    ORANGE(28, 70),  // 주황: 기초점수 70점
    BLACK(30, 80);   // 검정: 기초점수 80점

    private final int holdCount; // 총 홀드 수
    private final int baseScore; // ▼▼ 추가된 기초 점수 ▼▼
}