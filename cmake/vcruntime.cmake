function (cgen_target_vcrt_mt target)
if(MSVC)
  if(${CMAKE_VERSION} VERSION_GREATER_EQUAL "3.15.0")
    set_target_properties(${target} PROPERTIES MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")
  else()
    target_compile_options(${target} PRIVATE "/MT$<$<CONFIG:Debug>:d>")
  endif()
endif(MSVC)
endfunction()
