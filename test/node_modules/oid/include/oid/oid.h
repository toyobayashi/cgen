#ifndef __OID_H__
#define __OID_H__

#include <stdint.h>

#ifdef __cplusplus
#define OID_EXTERN_C_START extern "C" {
#define OID_EXTERN_C_END }
#else
#define OID_EXTERN_C_START
#define OID_EXTERN_C_END
#endif

#ifdef _WIN32
  #ifdef CCPM_BUILD_DLL_oid
  #define OID_API __declspec(dllexport)
  #else
  // #define OID_API __declspec(dllimport)
  #define OID_API
  #endif
#else
  #ifdef CCPM_BUILD_DLL_oid
  #define OID_API __attribute__((visibility("default")))
  #else
  #define OID_API
  #endif
#endif

OID_EXTERN_C_START

typedef struct object_id {
  uint8_t id[12];
} object_id;

OID_API int oid_construct(object_id* oid);
OID_API int oid_construct_with_time(object_id* oid, uint32_t time);
OID_API int oid_construct_with_buf(object_id* oid, const uint8_t* buf, uint32_t len);
OID_API int oid_construct_with_oid(object_id* oid, const object_id* other);

OID_API int oid_generate(uint32_t time, uint8_t* id);
OID_API int oid_create_from_hex_string(const char* hex_string, object_id* oid);
OID_API int oid_to_hex_string(const object_id* oid, char* res);
OID_API int oid_is_valid(const char* res);

OID_API int oid_equals_buf(const object_id* oid, const uint8_t* buf, uint32_t len);
OID_API int oid_equals_oid(const object_id* oid, const object_id* other);
OID_API int oid_create_from_time(uint32_t time, object_id* oid);
OID_API uint32_t oid_get_timestamp(const object_id* oid);

OID_EXTERN_C_END

#endif // !__OID_H__
