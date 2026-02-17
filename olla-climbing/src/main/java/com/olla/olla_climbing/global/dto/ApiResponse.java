package com.olla.olla_climbing.global.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ApiResponse<T> {

    private int status;       // HTTP 상태 코드 (예: 200, 201)
    private String message;   // 성공/실패 메시지 (예: "지구력 기록이 성공적으로 저장되었습니다.")
    private T data;           // 실제 클라이언트가 쓸 데이터 (Response DTO)

    // 성공했을 때 쓰는 전용 메서드 (데이터가 있을 때)
    public static <T> ApiResponse<T> success(int status, String message, T data) {
        return new ApiResponse<>(status, message, data);
    }

    // 성공했지만 돌려줄 데이터는 딱히 없을 때 (예: 삭제 API)
    public static <T> ApiResponse<T> success(int status, String message) {
        return new ApiResponse<>(status, message, null);
    }
}