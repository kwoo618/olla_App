package com.olla.olla_climbing.domain.member.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class FcmTokenRequest {
    private String deviceToken;

    public String getToken() {
        return this.deviceToken;
    }
}