1. API 연동 기본 구조

API_BASE_URL 위치 (src/constants/Config.ts) — 서버 주소 변경할 때 여기만 바꾸면 됨
axios 인터셉터가 App.tsx에 전역 등록되어 있음 — 401 뜨면 자동으로 토큰 재발급 시도하고 실패 시 세션 만료 모달 띄움
모든 인증 API는 Authorization: Bearer {token} 헤더 필요, AsyncStorage.getItem('userToken')으로 가져옴

2. ts/ 파일별 역할 + 연동 API 목록

어떤 파일이 어떤 엔드포인트 쓰는지 (예: Recode.ts → /records/beginner, /records/endurance, /records/series)

3. 회원권 로직 — 여러 파일에 중복 구현되어 있어서 중요

기간권/일일권 구분 로직이 Home.ts, MY.ts, Community.ts, Recode.ts, Ranking.ts에 각각 있음
변경 시 전부 수정해야 함 — 이걸 명시해줘야 함

4. 신규 화면 추가 시 체크리스트

App.tsx의 RootParamList 타입에 추가
Stack.Screen 추가
바텀탭이 필요하면 USER_TAB_ORDER 또는 ADMIN_TAB_ORDER 배열에 추가

5. 빌드 관련

Android: react-native run-android, APK는 ./gradlew assembleRelease
iOS: react-native run-ios, 배포는 Xcode에서 Archive
환경변수 주의: Config.ts의 URL이 개발/운영 다름

6. FCM 토큰 흐름

로그인 시 자동 등록, 로그아웃 시 서버에 null 전송
App.tsx의 registerFcmToken() 함수가 담당