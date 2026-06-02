# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Notifee 네이티브 모듈이 난독화/삭제되지 않도록 보호
-keep class app.notifee.** { *; }
-dontwarn app.notifee.**

# (선택) Firebase 관련 오류 방지
-keep class com.google.firebase.** { *; }