package com.olla.olla_climbing.global.config;

import com.olla.olla_climbing.domain.admin.entity.Notice;
import com.olla.olla_climbing.domain.admin.repository.NoticeRepository;
import com.olla.olla_climbing.domain.member.entity.Member;
import com.olla.olla_climbing.domain.member.enums.Role;
import com.olla.olla_climbing.domain.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;

@Configuration
@RequiredArgsConstructor
public class DataInitializer {
    private final MemberRepository memberRepository;
    private final NoticeRepository noticeRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
    public CommandLineRunner initData() {
        return args -> {
            // 1. 관리자 1명 생성 (필수 필드 모두 포함)
            if (memberRepository.findByLoginId("admin").isEmpty()) {
                memberRepository.save(Member.builder()
                        .loginId("admin")
                        .password(passwordEncoder.encode("1234"))
                        .name("관리자")
                        .phone("010-0000-0000")
                        .email("admin@olla.com")
                        .role(Role.ADMIN)
                        .gender("남")
                        .birthDate(LocalDate.of(1995, 1, 1))
                        .build());
            }

            // 2. 회원 1명 생성
            if (memberRepository.findByLoginId("user1").isEmpty()) {
                memberRepository.save(Member.builder()
                        .loginId("user1")
                        .password(passwordEncoder.encode("1234"))
                        .name("테스터1")
                        .phone("010-1234-5678")
                        .email("user1@olla.com")
                        .role(Role.USER)
                        .gender("여")
                        .birthDate(LocalDate.of(2000, 5, 5))
                        .build());
            }

            // 3. 공지사항 2개 생성
            if (noticeRepository.count() < 2) {
                // 관리자 계정을 미리 조회해서 가져옵니다.
                Member admin = memberRepository.findByLoginId("admin")
                        .orElseThrow(() -> new IllegalArgumentException("관리자를 찾을 수 없습니다."));

                noticeRepository.save(Notice.builder()
                        .member(admin) // 💡 작성자 연결!
                        .title("서비스 오픈 공지")
                        .content("환영합니다.")
                        .build());

                noticeRepository.save(Notice.builder()
                        .member(admin) // 💡 작성자 연결!
                        .title("암장 이용 수칙")
                        .content("안전하게 이용하세요.")
                        .build());
            }
        };
    }
}