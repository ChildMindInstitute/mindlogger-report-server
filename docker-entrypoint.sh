#!/bin/bash

if [ "${DD_TRACE_ENABLED}" == "true" ]; then
  TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600") && \
    export DD_AGENT_HOST=$(curl http://169.254.169.254/latest/meta-data/local-ipv4 -H "X-aws-ec2-metadata-token: $TOKEN")
fi

set -o errexit
set -o pipefail
set -o nounset

exec "$@"
