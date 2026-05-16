if(NOT TARGET hermes-engine::hermesvm)
add_library(hermes-engine::hermesvm SHARED IMPORTED)
set_target_properties(hermes-engine::hermesvm PROPERTIES
    IMPORTED_LOCATION "C:/Users/82103/.gradle/caches/9.3.1/transforms/7d0f26975f285b3a9c9e49dffaf929cd/workspace/transformed/hermes-android-250829098.0.10-debug/prefab/modules/hermesvm/libs/android.x86/libhermesvm.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/82103/.gradle/caches/9.3.1/transforms/7d0f26975f285b3a9c9e49dffaf929cd/workspace/transformed/hermes-android-250829098.0.10-debug/prefab/modules/hermesvm/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

