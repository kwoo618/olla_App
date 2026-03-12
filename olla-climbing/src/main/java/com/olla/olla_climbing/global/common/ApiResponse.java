package com.olla.olla_climbing.global.common;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ApiResponse<T> {

    private final int status;
    private final String message;
    private final T data;

    // 성공 응답 (데이터가 있을 때)
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(200, "성공", data);
    }

    // 성공 응답 (데이터가 없을 때, 예: 단순 삭제 완료)
    public static <T> ApiResponse<T> success() {
        return new ApiResponse<>(200, "성공", null);
    }

    // 에러 응답
    public static <T> ApiResponse<T> error(int status, String message) {
        return new ApiResponse<>(status, message, null);
    }

    // 에러 응답 (상세 에러 데이터가 포함될 때, 예: 유효성 검사 실패 필드 목록)
    public static <T> ApiResponse<T> error(int status, String message, T data) {
        return new ApiResponse<>(status, message, data);
    }
}