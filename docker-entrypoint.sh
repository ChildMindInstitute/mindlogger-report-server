#!/bin/sh

if [ "${DD_TRACE_ENABLED}" = "true" ]; then
  TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600") && \
    DD_TRACE_AGENT_HOSTNAME=$(curl http://169.254.169.254/latest/meta-data/local-ipv4 -H "X-aws-ec2-metadata-token: $TOKEN")
    export DD_TRACE_AGENT_HOSTNAME
fi

set -o errexit
set -o nounset

exec "$@"
