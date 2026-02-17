package com.olla.olla_climbing.domain.record.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum Difficulty {
    WHITE(26),
    YELLOW(33),
    GREEN(28),
    BLUE(26),
    RED(26),
    PURPLE(25),
    ORANGE(28),
    BLACK(30);

    private final int holdCount; // 해당 난이도의 총 홀드 수
}