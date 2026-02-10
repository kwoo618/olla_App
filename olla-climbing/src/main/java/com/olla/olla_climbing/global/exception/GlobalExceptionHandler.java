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
}
