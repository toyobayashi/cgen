#ifndef __LIB_H__
#define __LIB_H__

#ifdef __cplusplus
  #define EXTERN_C_START extern "C" {
  #define EXTERN_C_END }
#else
  #define EXTERN_C_START
  #define EXTERN_C_END
#endif

#ifdef _WIN32
  #ifdef LIB_BUILD_DLL
  #define LIB_API __declspec(dllexport)
  #else
  // #define LIB_API __declspec(dllimport)
  #define LIB_API
  #endif
#else
  #ifdef LIB_BUILD_DLL
  #define LIB_API __attribute__((visibility("default")))
  #else
  #define LIB_API
  #endif
#endif

EXTERN_C_START
LIB_API int add(int, int);
EXTERN_C_END

#endif
