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

    // 1. 자동 포장기(Advice)에서 사용하는 기본 성공 메서드
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(200, "성공", data);
    }

    // 2. 컨트롤러에서 수작업으로 상태코드와 메시지를 지정하고 싶을 때 (보강됨)
    public static <T> ApiResponse<T> success(int status, String message, T data) {
        return new ApiResponse<>(status, message, data);
    }

    // 3. 성공했지만 돌려줄 데이터가 없을 때
    public static <T> ApiResponse<T> success() {
        return new ApiResponse<>(200, "성공", null);
    }

    // 4. 에러 발생 시 (status와 message만 전달)
    public static <T> ApiResponse<T> error(int status, String message) {
        return new ApiResponse<>(status, message, null);
    }

    // 5. 에러 발생 시 상세 데이터(예: 검증 에러 목록)도 함께 보낼 때
    public static <T> ApiResponse<T> error(int status, String message, T data) {
        return new ApiResponse<>(status, message, data);
    }
}