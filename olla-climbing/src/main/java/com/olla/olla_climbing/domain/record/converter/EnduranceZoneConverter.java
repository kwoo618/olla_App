package com.olla.olla_climbing.domain.record.converter;

import com.olla.olla_climbing.domain.record.enums.EnduranceZone;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Arrays;

// EnduranceZone과 DB에 저장되는 Integer 값을 상호 변환하는 클래스
// converter는 JPA가 엔티티 필드와 DB 컬럼 간의 변환을 자동으로 처리할 수 있게 해줌
@Converter(autoApply = true) // 이 타입이 쓰이면 자동으로 변환기 작동
public class EnduranceZoneConverter implements AttributeConverter<EnduranceZone, Integer> {

    // 엔티티의 EnduranceZone을 DB에 저장할 Integer로 변환
    @Override
    public Integer convertToDatabaseColumn(EnduranceZone zone) {
        if (zone == null) return 0; // null 방어
        return zone.getLevel();     // TIGER 대신 5가 저장됨
    }

    // DB에서 읽은 Integer를 엔티티의 EnduranceZone으로 변환
    @Override
    public EnduranceZone convertToEntityAttribute(Integer dbData) {
        if (dbData == null || dbData == 0) return null;
        return Arrays.stream(EnduranceZone.values())
                .filter(z -> z.getLevel() == dbData)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("알 수 없는 구역 레벨입니다: " + dbData));
    }
}