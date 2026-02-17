package com.olla.olla_climbing.domain.record.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum EnduranceZone {
    MOUSE(1, "쥐"),
    RABBIT(2, "토끼"),
    DEER(3, "사슴"),
    BEAR(4, "곰"),
    TIGER(5, "호랑이");

    private final int level;
    private final String description;
}