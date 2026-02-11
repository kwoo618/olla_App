package com.olla.olla_climbing.global.exception;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice   // 모든 컨트롤러에서 발생하는 예외를 처리하는 전역 예외 처리기
public class GlobalExceptionHandler {

    // @Valid 검증 실패 시 발생하는 MethodArgumentNotValidException 예외 처리 메서드
    // @ExceptionHandler: 특정 예외가 발생했을 때 이 메서드가 호출되도록 지정
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationExceptions(MethodArgumentNotValidException ex) {

        // MethodArgumentNotValidException: @Valid 검증 실패 시 발생하는 예외

        Map<String, String> errors = new HashMap<>();

        // 에러가 난 필드와 메시지를 맵에 담기
        ex.getBindingResult().getAllErrors().forEach((error) ->{
            String fieldName = ((FieldError) error).getField();     // 에러가 난 필드 이름
            String errorMessage = error.getDefaultMessage();        // 에러 메시지
            errors.put(fieldName, errorMessage);    // 맵에 추가
        });

        // 400 Bad Request 상태 코드와 에러 맵을 응답으로 반환
        return ResponseEntity.badRequest().body(errors);
    }

    // IllegalArgumentException 예외 처리 메서드: Service나 Controller에서 부적절한 인자가 들어왔을 때 발생시키는 예외
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException ex) {
        // Service나 Controller에서 적은 예외 메시지를 그대로 클라이언트에 전달
        // 400 Bad Request 상태 코드와 예외 메시지를 응답으로 반환
        return ResponseEntity.badRequest().body(ex.getMessage());
    }

    // [최후의 수단] 모든 에러를 다 잡는 메서드: Exception 최상위 예외 처리
    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleAllException(Exception ex) {
        ex.printStackTrace(); // 콘솔에 빨간 줄로 에러 위치 표시

        // 브라우저(Swagger) 화면에 진짜 에러 원인을 보여줌
        return ResponseEntity.status(500).body("🚨 진짜 에러 원인: " + ex.getMessage());
    }
}
