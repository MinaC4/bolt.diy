# Run bolt.diy on the local k3d cluster

These manifests target the existing single-node k3d-openchoreo cluster. The
app runs as one pod with a 250m CPU / 512Mi memory request and a 1 CPU / 1Gi
memory limit. Project development runs inside WebContainers in each browser,
so the cluster does not need a local model server or large build resources.
No provider keys are stored in the image or Kubernetes manifests.

## Build and deploy

The codex/cluster-deploy branch publishes
ghcr.io/minac4/bolt.diy:cluster-deploy through GitHub Actions. Wait for the
Docker Publish workflow to finish, then run:

    bash deploy/kubernetes/deploy.sh

The script asks cert-manager to issue a LAN certificate from the cluster's
existing gateway CA, adds that certificate to the existing HTTPS listener while
preserving its current certificate, creates the Deployment and Service, and
waits until the pod is ready.

Open https://bolt.192.168.1.3.nip.io:18443 from a device on the same LAN. The
name resolves to the current LAN address used by this cluster. If that address
changes, update the hostname in certificate.yaml and app.yaml, reissue the
certificate, and use the gateway's updated address. The device must trust the
LAN root CA for secure browser features such as WebContainers.

## Restart and saved work

Kubernetes recreates the app pod after a pod or Docker Desktop restart. The
app server is stateless: chats, settings, and project snapshots are stored by
bolt.diy in each browser's IndexedDB, local storage, and cookies. They survive
server restarts in that same browser profile, but they do not automatically
sync between devices. Use bolt.diy's import/export settings to transfer browser
data between profiles. Provider API keys configured in the UI are per browser.

The k3d cluster and its local-path volumes live on this computer. They return
when Docker Desktop and the cluster start again, but the app is unavailable
while the host computer is off. This route is LAN-only; access away from home
requires a VPN or a separately configured public domain and ingress.

After publishing a later image to the same tag, apply it with:

    kubectl rollout restart deployment/bolt-diy --namespace bolt-diy
    kubectl rollout status deployment/bolt-diy --namespace bolt-diy

## Checks

    kubectl get deployment,service,httproute -n bolt-diy
    kubectl get certificate bolt-lan-gateway-tls -n openchoreo-control-plane
    curl -kI https://bolt.192.168.1.3.nip.io:18443/
