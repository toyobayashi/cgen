#include <napi.h>
#include <iostream>
#include "lib.h"

static Napi::Value Main(const Napi::CallbackInfo& info) {
  std::cout << add(2, 4) << "\n";
  return info.Env().Undefined();
}

static Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("main", Napi::Function::New(env, Main, "main"));
  return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)
