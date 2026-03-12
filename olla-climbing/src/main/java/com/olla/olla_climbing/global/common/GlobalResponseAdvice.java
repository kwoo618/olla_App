package com.olla.olla_climbing.global.common;

import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

// 팩트 체크: Swagger 오류 방지를 위해 우리 도메인 패키지에서 나오는 응답만 낚아채도록 설정합니다.
// (본인의 컨트롤러들이 모여있는 상위 패키지 경로로 수정해 주세요. 예: com.olla.olla_climbing.domain)
@RestControllerAdvice(basePackages = "com.olla.olla_climbing.domain")
public class GlobalResponseAdvice implements ResponseBodyAdvice<Object> {

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        // 이미 ApiResponse 타입으로 반환하는 경우(예: GlobalExceptionHandler의 에러 응답)는 중복 포장하지 않음
        return !returnType.getParameterType().equals(ApiResponse.class);
    }

    @Override
    public Object beforeBodyWrite(Object body, MethodParameter returnType, MediaType selectedContentType,
                                  Class<? extends HttpMessageConverter<?>> selectedConverterType,
                                  ServerHttpRequest request, ServerHttpResponse response) {

        // 데이터가 없는 void 반환 타입이나 null일 경우
        if (body == null) {
            return ApiResponse.success();
        }

        // 정상 데이터 반환 시 ApiResponse.success() 로 감싸서 리턴
        return ApiResponse.success(body);
    }
}