package com.olla.olla_climbing.global.common;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;

// 도메인 컨트롤러 응답만 가로채서 ApiResponse로 자동 포장
// Swagger 등 외부 라이브러리 응답은 포장하지 않음
@RestControllerAdvice(basePackages = "com.olla.olla_climbing.domain")
@RequiredArgsConstructor
public class GlobalResponseAdvice implements ResponseBodyAdvice<Object> {

    private final ObjectMapper objectMapper;

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        // 이미 ApiResponse면 포장 건너뜀
        if (ApiResponse.class.isAssignableFrom(returnType.getParameterType())) {
            return false;
        }

        // ResponseEntity<ApiResponse<T>> 형태도 포장 건너뜀
        if (ResponseEntity.class.isAssignableFrom(returnType.getParameterType())) {
            Type genericType = returnType.getGenericParameterType();
            if (genericType instanceof ParameterizedType pt) {
                Type[] args = pt.getActualTypeArguments();
                if (args.length > 0 && args[0] instanceof ParameterizedType innerPt) {
                    Type rawType = innerPt.getRawType();
                    if (rawType instanceof Class<?> cls && ApiResponse.class.isAssignableFrom(cls)) {
                        return false;
                    }
                }
                // ResponseEntity<ApiResponse> (제네릭 없는 경우)
                if (args.length > 0 && args[0] instanceof Class<?> cls
                        && ApiResponse.class.isAssignableFrom(cls)) {
                    return false;
                }
            }
        }

        return true;
    }

    @Override
    public Object beforeBodyWrite(Object body, MethodParameter returnType, MediaType selectedContentType,
                                  Class<? extends HttpMessageConverter<?>> selectedConverterType,
                                  ServerHttpRequest request, ServerHttpResponse response) {
        if (body instanceof String) {
            try {
                response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
                return objectMapper.writeValueAsString(ApiResponse.success(body));
            } catch (JsonProcessingException e) {
                throw new RuntimeException("JSON 직렬화 중 오류가 발생했습니다.", e);
            }
        }

        if (body == null) {
            return ApiResponse.success();
        }

        // 이미 ApiResponse 인스턴스면 그대로 반환 (런타임 이중 포장 방지)
        if (body instanceof ApiResponse<?>) {
            return body;
        }

        return ApiResponse.success(body);
    }
}