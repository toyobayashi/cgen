function(cgen_napi TARGETNAME)
  execute_process(COMMAND node -p "require('node-addon-api').include_dir"
    WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
    OUTPUT_VARIABLE NODE_ADDON_API_DIR
    ERROR_VARIABLE STD_ERR
  )
  if(STD_ERR)
    message(FATAL_ERROR "JavaScript Error: " ${STD_ERR})
  endif()

  set(NAPIVERSION ${ARGV1})

  if("${NAPIVERSION}" STREQUAL "")
    execute_process(COMMAND node -p "process.versions.napi"
      WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
      OUTPUT_VARIABLE NAPIVERSION
      ERROR_VARIABLE STD_ERR_A
    )
    if(STD_ERR_A)
      message(FATAL_ERROR "JavaScript Error: " ${STD_ERR_A})
    endif()
    if(NAPIVERSION)
      string(REGEX REPLACE "[\r\n\"]" "" NAPIVERSION ${NAPIVERSION})
    else()
      message(FATAL_ERROR "Cannot get napi version")
    endif()
  endif()

  if(NODE_ADDON_API_DIR)
    string(REGEX REPLACE "[\r\n\"]" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})
    string(REPLACE "\\" "/" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})

    target_include_directories(${TARGETNAME} PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}/${NODE_ADDON_API_DIR}")
    target_compile_definitions(${TARGETNAME} PUBLIC "NAPI_VERSION=${NAPIVERSION}")
    message("NAPI_VERSION=${NAPIVERSION}")
  else()
    message(FATAL_ERROR "Cannot find module: node-addon-api")
  endif()
endfunction()
