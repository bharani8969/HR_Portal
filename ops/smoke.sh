#!/usr/bin/env bash
# Post-deploy smoke test: ./ops/smoke.sh https://hrms.example.com
set -uo pipefail
BASE="${1:?base url}"; fail=0
check() { if eval "$2"; then echo "PASS  $1"; else echo "FAIL  $1"; fail=1; fi; }
check "health returns ok"                 "curl -fsS $BASE/api/v1/health | grep -q '\"status\":\"ok\"'"
check "protected API rejects anonymous"   "[ \$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/v1/employees) = 401 ]"
check "admin API rejects anonymous"       "[ \$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/v1/admin/hr-users) = 401 ]"
check "CSRF/origin guard on login"        "[ \$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Origin: https://evil.example' -H 'Content-Type: application/json' -d '{}' $BASE/api/v1/auth/login) = 403 ]"
check "nosniff header present"            "curl -sI $BASE/ | grep -qi 'x-content-type-options: nosniff'"
check "CSP header present"                "curl -sI $BASE/ | grep -qi 'content-security-policy'"
check "no server version banner"          "! curl -sI $BASE/ | grep -qi 'server: nginx/'"
check "HTTPS in use"                      "case $BASE in https://*) true;; *) false;; esac"
exit $fail
