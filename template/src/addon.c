#include <node_api.h>
#include "lib.h"

#define NAPI_CALL(env, call)                                      \
  do {                                                            \
    napi_status status = (call);                                  \
    if (status != napi_ok) {                                      \
      const napi_extended_error_info* error_info = NULL;          \
      napi_get_last_error_info((env), &error_info);               \
      bool is_pending;                                            \
      napi_is_exception_pending((env), &is_pending);              \
      if (!is_pending) {                                          \
        const char* message = (error_info->error_message == NULL) \
            ? "empty error message"                               \
            : error_info->error_message;                          \
        napi_throw_error((env), NULL, message);                   \
        return NULL;                                              \
      }                                                           \
    }                                                             \
  } while(0)

static napi_value Main(napi_env env, napi_callback_info info) {
  napi_value result;
  NAPI_CALL(env, napi_create_int32(env, add(1, 2), &result));
  return result;
}

static napi_value create_addon(napi_env env) {
  napi_value result;
  NAPI_CALL(env, napi_create_object(env, &result));

  napi_value exported_function;
  NAPI_CALL(env, napi_create_function(env,
                                      "main",
                                      NAPI_AUTO_LENGTH,
                                      Main,
                                      NULL,
                                      &exported_function));

  NAPI_CALL(env, napi_set_named_property(env,
                                         result,
                                         "main",
                                         exported_function));

  return result;
}

NAPI_MODULE_INIT() {
  return create_addon(env);
}
