#ifdef _WIN32
#include <Windows.h>
#define EPOCHFILETIME (116444736000000000UL)
#else
#include <sys/time.h>
#endif

#include <stdlib.h>
#include <time.h>
#include <string.h>
#include "oid/oid.h"

static uint8_t PROCESS_UNIQUE[5] = { 0 };
static uint32_t __index = 0;
static uint8_t decode_lookup[103] = { 0 };
static uint8_t initialized = 0;

static char hex_table[256][3];

static const char hex[16] = { '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f' };

static double math_random() {
  int r = rand();
  if (r == RAND_MAX) {
    r -= 1;
  }
  return (double)r / RAND_MAX;
}

static uint64_t date_now() {
#ifdef _WIN32
  FILETIME ft;
  LARGE_INTEGER li;
  uint64_t tt = 0;
  GetSystemTimeAsFileTime(&ft);
  li.LowPart = ft.dwLowDateTime;
  li.HighPart = ft.dwHighDateTime;
  tt = (li.QuadPart - EPOCHFILETIME) / 10 / 1000;
  return (uint64_t)tt;
#else
  struct timeval tv;
  gettimeofday(&tv, NULL);
  return (uint64_t)(tv.tv_sec * 1000 + tv.tv_usec / 1000);
#endif
}

static void oid_init() {
  if (!initialized) {
    srand((unsigned int)date_now());
    for (uint8_t i = 0; i < 5; i++) {
      PROCESS_UNIQUE[i] = (uint8_t)(math_random() * 256);
    }
    __index = (uint32_t)(math_random() * 0xffffff);
    uint8_t i = 0;
    while (i < 10) {
      decode_lookup[0x30 + i] = i;
      i++;
    }
    while (i < 16) {
      decode_lookup[0x61 - 10 + i] = i;
      decode_lookup[0x41 - 10 + i] = decode_lookup[0x61 - 10 + i];
      i++;
    }

    for (uint8_t i = 0; i < 16; i++) {
      for (uint8_t j = 0; j < 16; j++) {
        hex_table[i * 16 + j][0] = hex[i];
        hex_table[i * 16 + j][1] = hex[j];
        hex_table[i * 16 + j][2] = '\0';
      }
    }
    initialized = 1;
  }
}

static uint32_t oid_get_inc() {
  oid_init();
  return (__index = (__index + 1) % 0xffffff);
}

int oid_create_from_time(uint32_t time, object_id* oid) {
  uint8_t buf[12] = { 0 };
  if (oid == NULL) return -1;
  buf[3] = time & 0xff;
  buf[2] = (time >> 8) & 0xff;
  buf[1] = (time >> 16) & 0xff;
  buf[0] = (time >> 24) & 0xff;
  return oid_construct_with_buf(oid, buf, 12);
}

uint32_t oid_get_timestamp(const object_id* oid) {
  if (oid == NULL) return 0;
  uint32_t first = oid->id[0];
  uint32_t last = oid->id[3];
  uint32_t res = 0;
  res = (first << 24) | ((uint32_t)oid->id[1] << 16) | ((uint32_t)oid->id[2] << 8) | last;
  return res;
}

int oid_equals_buf(const object_id* oid, const uint8_t* buf, uint32_t len) {
  if (oid == NULL || buf == NULL) return -1;

  if (len == 12) {
    for (uint8_t i = 0; i < 12; i++) {
      if (oid->id[i] != buf[i]) {
        return 0;
      }
    }
    return 1;
  }

  if (len == 24) {
    char hex[25];
    char lower[25];
    for (uint8_t i = 0; i < 24; i++) {
      char c = buf[i];
      if (c >= 'A' && c <= 'Z') {
        lower[i] = (c | 0x20);
      } else {
        lower[i] = c;
      }
    }
    lower[24] = 0;
    oid_to_hex_string(oid, hex);
    return (strcmp(hex, lower) == 0);
  }

  return 0;
}

int oid_equals_oid(const object_id* oid, const object_id* other) {
  if (other == NULL) return -1;
  return oid_equals_buf(oid, other->id, 12);
}

int oid_construct(object_id* oid) {
  return oid_construct_with_time(oid, (uint32_t)time(NULL));
}

int oid_construct_with_time(object_id* oid, uint32_t time) {
  if (oid == NULL) return -1;
  oid_init();
  return oid_generate(time, oid->id);
}

int oid_construct_with_buf(object_id* oid, const uint8_t* buf, uint32_t len) {
  if (oid == NULL) return -1;

  if (len == 24) {
    return oid_create_from_hex_string((const char*)buf, oid);
  }

  if (len == 12 && buf != NULL) {
    for (uint8_t i = 0; i < len; i++) {
      oid->id[i] = buf[i];
    }
    return 0;
  }

  for (uint8_t i = 0; i < len; i++) {
    oid->id[i] = 0;
  }
  return -1;
}

int oid_create_from_hex_string(const char* hex_string, object_id* oid) {
  if (hex_string == NULL || oid == NULL) return -1;
  uint8_t buf[12];
  uint8_t n = 0;
  uint8_t i = 0;
  oid_init();
  while (i < 24) {
    uint8_t high = (decode_lookup[hex_string[i++]] << 4);
    uint8_t low = decode_lookup[hex_string[i++]];
    buf[n++] = (high | low);
  }
  return oid_construct_with_buf(oid, buf, 12);
}

int oid_construct_with_oid(object_id* oid, const object_id* other) {
  if (other == NULL) return -1;
  return oid_construct_with_buf(oid, other->id, 12);
}

int oid_generate(uint32_t time, uint8_t* id) {
  if (id == NULL) return -1;
  oid_init();
  uint32_t inc = oid_get_inc();

  // 4-byte timestamp
  id[3] = time & 0xff;
  id[2] = (time >> 8) & 0xff;
  id[1] = (time >> 16) & 0xff;
  id[0] = (time >> 24) & 0xff;

  // 5-byte process unique
  id[4] = PROCESS_UNIQUE[0];
  id[5] = PROCESS_UNIQUE[1];
  id[6] = PROCESS_UNIQUE[2];
  id[7] = PROCESS_UNIQUE[3];
  id[8] = PROCESS_UNIQUE[4];

  // 3-byte counter
  id[11] = inc & 0xff;
  id[10] = (inc >> 8) & 0xff;
  id[9] = (inc >> 16) & 0xff;

  return 0;
}

int oid_to_hex_string(const object_id* oid, char* res) {
  if (oid == NULL || res == NULL) return -1;
  uint8_t i;
  for (i = 0; i < 12; i++) {
    res[i * 2] = hex_table[oid->id[i]][0];
    res[i * 2 + 1] = hex_table[oid->id[i]][1];
  }
  res[i * 2] = '\0';
  return 0;
}

int oid_is_valid(const char* str) {
  if (str == NULL) return 0;
  uint64_t len = strlen(str);
  return len == 12 || len == 24 ? 1 : 0;
}
