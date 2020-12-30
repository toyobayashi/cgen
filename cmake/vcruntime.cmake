function (with_mt_if_msvc target)
if(MSVC)
  if(${CMAKE_MINIMUM_REQUIRED_VERSION} VERSION_GREATER_EQUAL "3.15")
    set_target_properties(${target} PROPERTIES MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")
  else()
    set(_mt "/MT$<$<CONFIG:Debug>:d>")
    get_target_property(_options ${target} COMPILE_OPTIONS)
    if(_options)
      if(${_options} MATCHES "/MD")
        string(REGEX REPLACE "/MD" "/MT" _options "${_options}")
      else()
        set(_options "${_options} ${_mt}")
      endif()
    else()
      set(_options "${_mt}")
    endif()

    target_compile_options( ${target} PRIVATE "${_options}")
    unset(_mt)
    unset(_options)
  endif()
endif(MSVC)
endfunction()
