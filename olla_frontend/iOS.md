------------- iOS 관련 --------------------


# iOS 인수인계 문서 — olla 클라이밍 앱

---

## 1. 프로젝트 기본 정보

| 항목 | 값 |
|------|-----|
| 앱 이름 | 올라가자 |
| Bundle ID | `com.ollagaja.app` |
| 최소 지원 버전 | iOS 15.1 |
| Swift 버전 | 5.0 |
| React Native 버전 | 0.85.3 |
| Development Team | G387N62Z7Z |

---

## 2. 개발 환경 세팅 (처음 클론 후 해야 할 것들)

```bash
# 1. 의존성 설치
npm install

# 2. iOS Pod 설치 (반드시 ios 폴더 안에서)
cd ios && pod install && cd ..

# 3. 개발 서버 실행
npm start

# 4. iOS 빌드 (시뮬레이터)
npm run ios
# 또는 특정 기기 지정
npx react-native run-ios --device "기기이름"
```

> ⚠️ **pod install 안 하면 빌드 에러 남** — node_modules 변경 후에도 반드시 재실행

---

## 3. 실제 기기 배포 (TestFlight / App Store)

1. **Xcode 열기**: `ios/olla_react.xcworkspace` 파일로 열어야 함
   - `.xcodeproj`로 열면 안 됨, 반드시 `.xcworkspace`로 열 것

2. **빌드 전 체크리스트**
   - Xcode 상단 → 기기를 "Any iOS Device (arm64)"로 변경
   - Product → Scheme → olla_react 선택 확인
   - Signing → Team: G387N62Z7Z 확인

3. **아카이브 및 업로드**
   ```
   Product → Archive → Distribute App → App Store Connect
   ```

4. **버전 올릴 때**
   - `ios/olla_react.xcodeproj/project.pbxproj` 에서
   - `MARKETING_VERSION` (앱스토어 표시 버전, 예: 1.0.1)
   - `CURRENT_PROJECT_VERSION` (빌드 번호, 매 업로드마다 올려야 함)

---

## 4. Firebase / FCM 관련

### 파일 위치
```
ios/GoogleService-Info.plist   ← Firebase 인증 파일 (절대 gitignore 해제하지 말 것)
```

### 동작 방식
- `AppDelegate.swift`에서 `FirebaseApp.configure()` 호출로 초기화
- APNs 토큰 → Firebase Messaging 토큰으로 자동 변환
- 포그라운드 알림: `App.tsx`의 `messaging().onMessage()` 처리
- 백그라운드 알림: `index.js`의 `setBackgroundMessageHandler()` 처리

### 알림이 안 올 때 체크리스트
1. `olla_react.entitlements` 파일의 `aps-environment` 값 확인
   - 개발: `development`
   - 배포: `production` **(배포 전 반드시 변경)**
2. Xcode → Signing & Capabilities → Push Notifications 활성화 확인
3. `Info.plist`의 `UIBackgroundModes`에 `remote-notification` 있는지 확인

### aps-environment 변경 방법
```
ios/olla_react/olla_react.entitlements 파일에서

개발:   <string>development</string>
배포:   <string>production</string>
```

---

## 5. 카메라 권한 (QR 스캔용)

`Info.plist`에 이미 선언되어 있음:
```xml
<key>NSCameraUsageDescription</key>
<string>회원 QR 코드 스캔 및 출석 처리를 위해 카메라 접근 권한이 필요합니다.</string>
```

권한 문구 변경 시 위 파일만 수정하면 됨.

---

## 6. 네트워크 설정

`Info.plist`에 ATS(App Transport Security) 임시 해제 설정이 있음:
```xml
<key>NSAllowsArbitraryLoads</key>
<true/>
```

> ⚠️ 현재 HTTP 통신도 허용된 상태. 운영 서버가 HTTPS로 완전히 전환되면
> 이 설정을 제거하거나 특정 도메인만 허용하는 방식으로 바꾸는 게 좋음.
> App Store 심사에서 문제가 될 수 있음.

---

## 7. 새 화면 추가 시 iOS에서 해야 할 것

React Native 특성상 iOS 네이티브 코드 수정 없이 JS/TS 파일만 추가하면 됨.
단, 아래 경우는 pod install 재실행 필요:

- 새 npm 패키지 설치 (`npm install 패키지명`)
- 네이티브 모듈 포함 패키지 (카메라, 파일, 알림 관련)

```bash
cd ios && pod install && cd ..
```

---

## 8. 자주 나오는 에러 & 해결법

| 에러 | 원인 | 해결 |
|------|------|------|
| `The sandbox is not in sync with the Podfile.lock` | pod install 안 함 | `cd ios && pod install` |
| `No bundle URL present` | Metro 서버 안 띄움 | `npm start` 먼저 실행 |
| `FCM 토큰 발급 실패` | APNs 인증서 문제 | entitlements의 aps-environment 확인 |
| 빌드는 되는데 알림 안 옴 | development/production 불일치 | entitlements 파일 확인 |
| pod install 중 에러 | CocoaPods 버전 문제 | `sudo gem install cocoapods` 후 재시도 |
| Xcode Archive 안 됨 | 빌드 넘버 중복 | CURRENT_PROJECT_VERSION 올리기 |

---

## 9. 주요 파일 위치 요약

```
ios/
├── GoogleService-Info.plist          ← Firebase 인증 (건드리지 말 것)
├── Podfile                           ← iOS 의존성 관리
├── Podfile.lock                      ← 의존성 버전 고정 (git에 포함)
└── olla_react/
    ├── AppDelegate.swift             ← Firebase 초기화, APNs 처리
    ├── Info.plist                    ← 권한, 앱 이름, 네트워크 설정
    ├── olla_react.entitlements       ← Push 알림 환경 설정 (dev/prod)
    └── Images.xcassets/             ← 앱 아이콘
        └── AppIcon.appiconset/
            └── Contents.json        ← 아이콘 파일 매핑
```

---

## 10. 앱 아이콘 교체 시

`ios/olla_react/Images.xcassets/AppIcon.appiconset/` 폴더 안에
`Contents.json`에 명시된 크기별 PNG 파일 교체하면 됨.

현재 필요한 파일 크기:
- 40px, 58px, 60px, 80px, 87px, 120px, 180px, 1024px

---

## 11. 배포 전 최종 체크리스트

- [ ] `aps-environment` → `production` 으로 변경
- [ ] `CURRENT_PROJECT_VERSION` 빌드 번호 올리기
- [ ] `MARKETING_VERSION` 버전 번호 확인
- [ ] `API_BASE_URL` 운영 서버 주소 확인 (`src/constants/Config.ts`)
- [ ] Firebase Console에서 APN 인증서 유효기간 확인
- [ ] TestFlight 배포 후 실제 알림 동작 테스트