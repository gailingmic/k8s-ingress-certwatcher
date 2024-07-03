# k8s-ingress-certwatcher

a REST API that uses the k8s API to figure out when Certificates used by the Ingress are running out.

TLDR:
```bash
# Install the Service!
helm install k8s-ingress-certwatcher oci://ghcr.io/gailingmic/k8s-ingress-certwatcher

# Port Forward it!
kubectl port-forward service/certwatcher-k8s-ingress-certwatcher 3000:3000

# Test it!
# /certs returns all certs with their time till invalid
# /certs/<days> returns only the certs that will get invalid within <days>
curl localhost:3000/certs
curl localhost:3000/certs/30
```