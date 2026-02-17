package com.olla.olla_climbing.domain.record.converter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.olla.olla_climbing.domain.record.enums.Difficulty;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.List;

@Converter
public class DifficultyListConverter implements AttributeConverter<List<Difficulty>, String> {

    private final ObjectMapper mapper = new ObjectMapper();

    // 1. 자바 List -> DB JSON 문자열로 변환 (저장할 때)
    @Override
    public String convertToDatabaseColumn(List<Difficulty> attribute) {
        if (attribute == null || attribute.isEmpty()) {
            return "[]"; // 빈 배열 반환
        }
        try {
            return mapper.writeValueAsString(attribute);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("연속 리드 배열을 JSON으로 변환하는 데 실패했습니다.", e);
        }
    }

    // 2. DB JSON 문자열 -> 자바 List로 복구 (조회할 때)
    @Override
    public List<Difficulty> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return List.of();
        }
        try {
            return mapper.readValue(dbData, new TypeReference<List<Difficulty>>() {});
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("DB의 JSON 데이터를 배열로 읽는 데 실패했습니다.", e);
        }
    }
}