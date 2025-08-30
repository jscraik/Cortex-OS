# Cert-Manager Quickstart (TLS for Ingress)

This guide shows how to enable TLS for the model-gateway and mcp-registry Helm charts using cert-manager.

## Install cert-manager (cluster admin)

Follow cert-manager docs for your cluster. Example (Helm):

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true
```

## Create a ClusterIssuer (Let’s Encrypt HTTP-01)

Adjust email and (optionally) use `letsencrypt-staging` for testing to avoid rate limits.

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    email: you@example.com
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

Apply it:

```bash
kubectl apply -f docs/k8s/cert-manager-clusterissuer.yaml
```

(You can save the above manifest as `docs/k8s/cert-manager-clusterissuer.yaml`.)

## Enable TLS in Helm values

For model-gateway (values.prod.yaml):

```yaml
ingress:
  enabled: true
  className: nginx
  hosts:
    - host: model-gateway.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: model-gateway-tls
      hosts:
        - model-gateway.example.com
```

For mcp-registry (values.prod.yaml):

```yaml
ingress:
  enabled: true
  className: nginx
  hosts:
    - host: mcp-registry.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: mcp-registry-tls
      hosts:
        - mcp-registry.example.com
```

## Issue Certificates with cert-manager

Create Certificate resources referencing the `ClusterIssuer` and ingress hosts, or let your Ingress annotations issue automatically depending on your controller. Example (explicit Certificate):

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: model-gateway-cert
  namespace: default
spec:
  secretName: model-gateway-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - model-gateway.example.com
```

Repeat for `mcp-registry`. Ensure DNS for your hosts points to your ingress controller.

## Notes

- For staging/testing, use the Let’s Encrypt staging server (`acme-staging-v02`) and separate ClusterIssuer.
- Some ingress controllers support automatic TLS via annotations; consult your controller docs if you prefer that flow.
- cert-manager requires HTTP-01 ACME challenge reachability. Confirm firewall/DNS rules.

