get_property(dirname GLOBAL PROPERTY CGEN_REQUIRE_CMAKE_DIR)
if(NOT dirname)
  set_property(GLOBAL PROPERTY CGEN_REQUIRE_CMAKE_DIR "${CMAKE_CURRENT_LIST_DIR}")
endif()
unset(dirname)

function(cgen_require NODE_MODULE)

get_property(__dirname GLOBAL PROPERTY CGEN_REQUIRE_CMAKE_DIR)

message("${CMAKE_CURRENT_SOURCE_DIR}> node -e \"const pathListComma = require(require('path').join('${__dirname}', '..')).resolve('${CMAKE_CURRENT_SOURCE_DIR}', require, '${NODE_MODULE}'); if (pathListComma) process.stdout.write(pathListComma);\"")
execute_process(COMMAND node -e "
const pathListComma = require(require('path').join('${__dirname}', '..')).resolve('${CMAKE_CURRENT_SOURCE_DIR}', require, '${NODE_MODULE}');
if (pathListComma) process.stdout.write(pathListComma);
"
  WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
  OUTPUT_VARIABLE PATH_LIST_COMMA
  ERROR_VARIABLE STD_ERR
)
unset(__dirname)

if(STD_ERR)
  message(FATAL_ERROR "JavaScript Error: " ${STD_ERR})
endif()

if(PATH_LIST_COMMA)
  string(REPLACE "\n" "" PATH_LIST_COMMA ${PATH_LIST_COMMA})

  string(REPLACE "," ";" PATH_LIST ${PATH_LIST_COMMA})
  list(GET PATH_LIST 0 ABSOLUTE_PATH)
  list(GET PATH_LIST 1 RELATIVE_PATH)
  get_property(CCPM_SOURCE_LIST GLOBAL PROPERTY "CCPM_SOURCE_LIST")
  if(NOT CCPM_SOURCE_LIST)
    set_property(GLOBAL PROPERTY "CCPM_SOURCE_LIST" "${ABSOLUTE_PATH}")
    message("${CMAKE_CURRENT_SOURCE_DIR} > add_subdirectory(\"${ABSOLUTE_PATH}\" \"${RELATIVE_PATH}\")")
    add_subdirectory(${ABSOLUTE_PATH} ${RELATIVE_PATH})
  else()
    list(FIND CCPM_SOURCE_LIST ${ABSOLUTE_PATH} FIND_INDEX)
    if(${FIND_INDEX} MATCHES "-1")
      set_property(GLOBAL PROPERTY "CCPM_SOURCE_LIST" "${CCPM_SOURCE_LIST};${ABSOLUTE_PATH}")
      message("${CMAKE_CURRENT_SOURCE_DIR} > add_subdirectory(\"${ABSOLUTE_PATH}\" \"${RELATIVE_PATH}\")")
      add_subdirectory(${ABSOLUTE_PATH} ${RELATIVE_PATH})
    else()
      message("${CMAKE_CURRENT_SOURCE_DIR} > skip ${ABSOLUTE_PATH}")
    endif()
  endif()

else()
  message(FATAL_ERROR "Cannot find module: " ${NODE_MODULE})
endif()

endfunction()
