#include <stdio.h>
#include <stdlib.h>
#include <memory.h>
#include "lib.h"
#include "oid/oid.h"

void _main() {
  char hex[25];
  memset(hex, 0, 25);
  printf("%d\n", add(1, 2));
  object_id id;
  oid_construct(&id);
  oid_to_hex_string(&id, hex);
  printf("%s\n", hex);
}
