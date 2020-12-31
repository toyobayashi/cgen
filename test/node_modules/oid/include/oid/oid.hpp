#ifndef __OID_HPP__
#define __OID_HPP__

#ifndef __CPP17__
#	ifdef _MSVC_LANG
#		if _MSVC_LANG > 201402L
#			define __CPP17__	1
#		endif /* _MSVC_LANG > 201402L */
#	else /* _MSVC_LANG */
#		if __cplusplus > 201402L
#			define __CPP17__	1
#		endif /* __cplusplus > 201402L */
# endif /* _MSVC_LANG */
#endif /* __CPP17__ */

#ifndef __CPP14__
#	ifdef _MSVC_LANG
#		if _MSVC_LANG > 201103L
#			define __CPP14__	1
#		endif /* _MSVC_LANG > 201103L */
#	else /* _MSVC_LANG */
#		if __cplusplus > 201103L
#			define __CPP14__	1
#		endif /* __cplusplus > 201103L */
#	endif /* _MSVC_LANG */
#endif /* __CPP14__ */

#ifndef __CPP11__
#	ifdef _MSVC_LANG
#		if _MSVC_LANG > 199711L
#			define __CPP11__	1
#		endif /* _MSVC_LANG > 199711L */
#	else /* _MSVC_LANG */
#		if __cplusplus > 199711L
#			define __CPP11__	1
#		endif /* __cplusplus > 199711L */
#	endif /* _MSVC_LANG */
#endif /* __CPP11__ */

#include <string>
#include <vector>
#include <ctime>
#include <iostream>
#include "oid.h"

class ObjectId {
private:
  object_id* oid;

public:
  ObjectId();
#ifdef __CPP11__
  ObjectId(ObjectId&&);
#endif
  ObjectId(const ObjectId&);
  ObjectId(const object_id&);
  ObjectId(uint32_t);
  ObjectId(const std::vector<uint8_t>&);
  ObjectId(const std::string&);
  ObjectId(const char*);
  ~ObjectId();

  ObjectId& operator=(const ObjectId&);

#ifdef __CPP11__
  ObjectId& operator=(ObjectId&&);
#endif

  bool operator==(const ObjectId&) const;

  friend std::ostream& operator<<(std::ostream&, const ObjectId&);

  static std::vector<uint8_t> generate();
  static std::vector<uint8_t> generate(uint32_t);
  static ObjectId createFromHexString(const std::string&);
  static ObjectId createFromTime(uint32_t);

  static bool isValid(const std::vector<uint8_t>&);
  static bool isValid(const std::string&);

  std::string toHexString() const;
  bool equals(const ObjectId&) const;
  const object_id* data() const;

  uint32_t getTimestamp() const;
};

inline const object_id* ObjectId::data() const { return oid; }

inline ObjectId& ObjectId::operator=(const ObjectId& id) {
  for (uint8_t i = 0; i < 12; i++) {
    oid->id[i] = id.oid->id[i];
  }
  return *this;
}

#ifdef __CPP11__
inline ObjectId& ObjectId::operator=(ObjectId&& tmp) {
  oid = tmp.oid;
  tmp.oid = nullptr;
  return *this;
}
inline ObjectId::ObjectId(ObjectId&& tmp) {
  oid = tmp.oid;
  tmp.oid = nullptr;
}
#endif

inline ObjectId::~ObjectId() {
  if (oid != nullptr) {
    delete oid;
    oid = nullptr;
  }
}

inline ObjectId::ObjectId() {
  oid = new object_id;
  oid_construct(oid);
}

inline ObjectId::ObjectId(const object_id& coid) {
  oid = new object_id;
  oid_construct_with_oid(oid, &coid);
}

inline ObjectId::ObjectId(const ObjectId& other) {
  oid = new object_id;
  oid_construct_with_oid(oid, other.oid);
}

inline ObjectId::ObjectId(uint32_t time) {
  oid = new object_id;
  oid_construct_with_time(oid, time);
}

inline ObjectId::ObjectId(const std::vector<uint8_t>& buf) {
  oid = new object_id;
  oid_construct_with_buf(oid, buf.data(), static_cast<uint32_t>(buf.size()));
}

inline ObjectId::ObjectId(const std::string& str) {
  oid = new object_id;
  oid_construct_with_buf(oid, (const uint8_t*)str.c_str(), static_cast<uint32_t>(str.length()));
}

inline ObjectId::ObjectId(const char* str): ObjectId(std::string(str)) {}

inline std::ostream& operator<<(std::ostream& os, const ObjectId& objectId) {
  os << objectId.toHexString();
  return os;
}

inline std::vector<uint8_t> ObjectId::generate() {
  return generate(static_cast<uint32_t>(time(nullptr)));
}

inline std::vector<uint8_t> ObjectId::generate(uint32_t time) {
  uint8_t buf[12] = { 0 };
  oid_generate(time, buf);
  return std::vector<uint8_t>(buf, buf + 12);
}

inline ObjectId ObjectId::createFromHexString(const std::string& hex) {
  object_id coid;
  oid_create_from_hex_string(hex.c_str(), &coid);
  return coid;
}

inline ObjectId ObjectId::createFromTime(uint32_t time) {
  object_id coid;
  oid_create_from_time(time, &coid);
  return coid;
}

inline bool ObjectId::isValid(const std::vector<uint8_t>& buf) {
  uint64_t len = buf.size();
  return (len == 12 || len == 24);
}

inline bool ObjectId::isValid(const std::string& str) {
  return oid_is_valid(str.c_str());
}

inline std::string ObjectId::toHexString() const {
  char res[25] = { 0 };
  oid_to_hex_string(oid, res);
  return res;
}

inline bool ObjectId::equals(const ObjectId& objectId) const {
  return static_cast<bool>(oid_equals_oid(oid, objectId.oid));
}

inline bool ObjectId::operator==(const ObjectId& objectId) const {
  return equals(objectId);
}

inline uint32_t ObjectId::getTimestamp() const {
  return oid_get_timestamp(oid);
}

#endif
