import SwiftUI

struct ContentView: View {
    // 0 = 사용자, 1 = 관리자 (나중에 백엔드 ROLE 데이터와 연결)
    @State private var userRole: String = "ROLE_USER"
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            // 1. 랭킹 페이지 (본인이 기획한 탭 디자인 포함)
            RankingView()
                .tabItem {
                    Label("랭킹", systemImage: "trophy.fill")
                }
                .tag(0)

            // 2. 기록 페이지 (도면 터치 로직 들어갈 곳)
            ClimbingRecordView()
                .tabItem {
                    Label("기록", systemImage: "figure.climbing")
                }
                .tag(1)

            // 3. 관리자 전용 (백엔드 ROLE이 ADMIN일 때만 나타남)
            if userRole == "ROLE_ADMIN" {
                AdminView()
                    .tabItem {
                        Label("관리자", systemImage: "lock.shield.fill")
                    }
                    .tag(2)
            }
        }
        .accentColor(.red) // 클라이밍 '빨강' 난이도 포인트 컬러
    }
}

// 임시 뷰들 (나중에 별도 파일로 분리하세요)
struct RankingView: View { var body: some View { Text("랭킹 화면 준비 중") } }
struct ClimbingRecordView: View { var body: some View { Text("기록 화면 준비 중") } }
struct AdminView: View { var body: some View { Text("관리자 전용 화면") } }
