#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
image_sha="$(git -C "$repo_root" rev-parse --short=7 HEAD)"
image="ghcr.io/minac4/bolt.diy:sha-$image_sha"
gateway_namespace="openchoreo-control-plane"
gateway_name="gateway-default"
certificate_name="bolt-lan-gateway-tls"

kubectl scale deployment cert-manager cert-manager-cainjector cert-manager-webhook \
  --namespace cert-manager --replicas=1
kubectl rollout status deployment/cert-manager --namespace cert-manager --timeout=180s
kubectl rollout status deployment/cert-manager-cainjector --namespace cert-manager --timeout=180s
kubectl rollout status deployment/cert-manager-webhook --namespace cert-manager --timeout=180s
kubectl scale deployment "$gateway_name" --namespace "$gateway_namespace" --replicas=1
kubectl rollout status "deployment/$gateway_name" \
  --namespace "$gateway_namespace" --timeout=180s

kubectl apply -f "$script_dir/certificate.yaml"
kubectl wait --for=condition=Ready "certificate/$certificate_name" \
  --namespace "$gateway_namespace" --timeout=180s

# Add this host's certificate without replacing the gateway's current certificate.
certificate_refs="$(kubectl get gateway "$gateway_name" --namespace "$gateway_namespace" \
  -o=jsonpath='{.spec.listeners[?(@.name=="https")].tls.certificateRefs[*].name}')"
if ! grep -qw "$certificate_name" <<<"$certificate_refs"; then
  listener_index="$(kubectl get gateway "$gateway_name" --namespace "$gateway_namespace" \
    -o=jsonpath='{range .spec.listeners[*]}{.name}{"\n"}{end}' |
    awk '$0 == "https" { print NR - 1 }')"
  if [[ -z "$listener_index" ]]; then
    echo "Could not find the HTTPS listener on Gateway $gateway_name" >&2
    exit 1
  fi
  kubectl patch gateway "$gateway_name" --namespace "$gateway_namespace" \
    --type=json \
    -p="[{\"op\":\"add\",\"path\":\"/spec/listeners/$listener_index/tls/certificateRefs/-\",\"value\":{\"group\":\"\",\"kind\":\"Secret\",\"name\":\"$certificate_name\"}}]"
fi

kubectl apply -f "$script_dir/app.yaml"
kubectl set image deployment/bolt-diy "bolt-diy=$image" --namespace bolt-diy
kubectl rollout status deployment/bolt-diy --namespace bolt-diy --timeout=300s

cat <<'EOF'
App route: https://bolt.192.168.1.3.nip.io:18443

If certificate validation fails on a device, install the existing LAN root CA
on that device and try again. The route is reachable on the local network only.
EOF
