# GitOps Microservice Platform

An end-to-end DevOps reference project spanning three deployment paths on
top of the same repo:

- **Path A — Kubernetes/GitOps (single service)**: Terraform provisions an
  EKS cluster, ArgoCD syncs Kubernetes manifests onto it. Realistic for
  production, but EKS's control plane is never free — treat this as a
  "spin up, screenshot, tear down" demo, not something to leave running.
- **Path B — Free-tier EC2 + Ansible**: Terraform provisions a single
  free-tier-eligible EC2 instance, Ansible installs Docker and deploys a
  stack via Docker Compose. Designed to cost $0 on a fresh AWS account.
- **Path C — Full-stack webapp, 3 environments**: a UI + API + DB stack
  (`webapp/`), each namespaced per environment (`webapp-dev`, `webapp-beta`,
  `webapp-prod`), continuously deployed by ArgoCD. Works on **any**
  Kubernetes cluster — including a free local `kind` cluster, so you don't
  need AWS at all to exercise this path. See below.

## Path C — full-stack webapp (UI + API + DB) across dev/beta/prod

```
webapp/
├── ui/    → React (Vite), served by nginx, API URL injected at container start
├── api/   → Node.js (Express) + Postgres (pg)
└── db/    → postgres:16-alpine + baked-in schema (init.sql)

webapp-k8s/
├── base/              → Deployment/StatefulSet/Service/ConfigMap/Secret/Ingress
└── overlays/{dev,beta,prod}/  → namespace, image tag, replica count, hostnames per env

.github/workflows/
├── ci-cd.yaml    → tests everything, builds images ONCE, tags them by git sha
├── cd-dev.yaml   → auto: retags that sha's webapp images as `dev` (no rebuild)
├── cd-beta.yaml  → manual (workflow_dispatch): retags a chosen sha as `beta`
└── cd-prod.yaml  → manual, `environment: production` (add required reviewers
                     in repo Settings → Environments for a real approval gate)

argocd/
├── webapp-applicationset.yaml  → ArgoCD Applications for dev + beta (auto-sync)
└── webapp-prod.yaml            → separate Application for prod (NO auto-sync —
                                    promoting prod always needs a manual
                                    `argocd app sync webapp-prod`)
```

**Build once, promote the same artifact** — `ci-cd.yaml` builds each image
exactly once per push to `main` and tags it only with the immutable git sha
(plus `:latest`). The three `cd-*.yaml` workflows never rebuild anything —
they just retag ("promote") that exact same image as `dev`, `beta`, or
`stable`, which is what each environment's overlay actually deploys. This
means dev, beta, and prod are provably running the identical bits, just at
different points in time — the standard pattern for trustworthy promotion.

**A deliberate gotcha, handled here**: a browser-rendered UI cannot call an
internal cluster-DNS name like `api.webapp-dev.svc.cluster.local` — the
browser is outside the cluster. So the UI's `API_BASE_URL` is injected at
container startup from a ConfigMap and always points at an **Ingress
hostname**, never the internal Service name.

### Seeing it for real: ArgoCD + the UI, entirely free, on your own machine

```bash
# 1. Local full-stack smoke test, no Kubernetes needed
cd webapp && docker compose up --build
# UI: http://localhost:8090   API: http://localhost:8080/api/items
```

For the actual GitOps flow with ArgoCD:

```bash
# 2. Create a local cluster with ingress ports mapped
kind create cluster --config kind-config.yaml

# 3. Install an ingress controller (kind's own recommended manifest)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod --selector=app.kubernetes.io/component=controller \
  --timeout=120s

# 4. Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl wait --namespace argocd \
  --for=condition=available deployment/argocd-server --timeout=180s

# 5. Point ArgoCD at your repo (dev + beta auto-sync, prod stays manual)
kubectl apply -f argocd/webapp-applicationset.yaml
kubectl apply -f argocd/webapp-prod.yaml

# 6. Open the ArgoCD UI
kubectl port-forward svc/argocd-server -n argocd 8080:443
# then visit https://localhost:8080
# username: admin
# password:
kubectl get secret argocd-initial-admin-secret -n argocd \
  -o jsonpath="{.data.password}" | base64 -d

# 7. Make the app's hostnames resolve locally
#    Add these lines to /etc/hosts (Linux/Mac) or
#    C:\Windows\System32\drivers\etc\hosts (Windows):
#    127.0.0.1  ui-dev.example.com api-dev.example.com
#    127.0.0.1  ui-beta.example.com api-beta.example.com
#    127.0.0.1  ui.example.com api.example.com

# 8. Browse the UI
#    http://ui-dev.example.com   (dev — auto-synced already)
```

**Promoting to beta/prod**: images only reach `beta`/`stable` tags when you
deliberately run the promotion workflow. From the Actions tab, run "CD -
promote to beta" (or prod), supplying the git sha from a successful CI/CD
run (visible in that run's URL or `git log --oneline`). ArgoCD then syncs
beta automatically once the tag updates; prod still needs a manual
`argocd app sync webapp-prod` (or click Sync in the UI) even after the image
is promoted — two independent gates for production, on purpose.

**One prerequisite**: the 3 `webapp-*` GHCR packages need to be pullable by
your cluster. Easiest for a personal project: make them public (GitHub
profile → Packages → each package → Settings → visibility). Otherwise,
create an `imagePullSecret` in each `webapp-*` namespace with a GHCR PAT.

The exact same `webapp-k8s/overlays/*` manifests apply unchanged to a real
EKS cluster (Path A) if you want the full cloud demo later — just update
`repoURL` in the ArgoCD manifests to your fork first, either way.

## A note on "free" on AWS (as of 2026)

AWS changed its Free Tier on July 15, 2025. If you sign up for a new account
today, you do **not** get the old "12 months of free EC2 hours." Instead:

- You choose a **Free Plan** at signup, which gives you **$100 in credit**
  (up to **$200** if you complete 5 onboarding tasks), usable for **up to 6
  months** or until the credit runs out.
- A card is required at signup, but nothing is charged unless you exceed the
  credit or switch to a Paid plan.
- Separately, AWS has an **"Always Free"** tier (Lambda, S3 5GB, DynamoDB
  25GB, SNS, etc.) with permanent monthly caps — these never expire, but
  don't include EC2.

So Path B (EC2) is "free" in the sense that a t3.micro instance costs a few
cents an hour, which the signup credit absorbs easily *if you don't leave it
running for months*. It is not free forever. Discipline: `terraform apply` →
do your work → `terraform destroy`. Also set an AWS Budgets alert at $1 so
you get emailed before anything is ever actually charged.

## Repo layout

| Path | Purpose |
|---|---|
| `app/` | Python (Flask) API + Dockerfile + unit tests |
| `java-service/` | Java API, dependency-free (`com.sun.net.httpserver`) + Dockerfile |
| `docker-compose.yml` | Runs both services together — used locally and by Ansible |
| `terraform/` | Path A: AWS VPC + EKS (paid, `modules/vpc` + `modules/eks`) |
| `k8s/`, `argocd/` | Path A: Kustomize manifests + ArgoCD `Application` |
| `terraform-free-tier/` | Path B: single EC2 instance, no NAT Gateway, no EKS |
| `ansible/` | Path B: playbook that installs Docker and deploys the Compose stack |
| `webapp/` | Path C: UI (React/Vite + nginx), API (Node.js/Express + Postgres), DB (custom Postgres image) |
| `webapp-k8s/` | Path C: Kustomize base + dev/beta/prod overlays, one namespace each |
| `argocd/webapp-*.yaml` | Path C: ArgoCD ApplicationSet (dev/beta, auto-sync) + prod Application (manual sync) |
| `.github/workflows/ci-cd.yaml` | CI for all services + both Terraform envs + webapp-k8s overlays; builds & pushes 5 images total |
| `.github/workflows/cd-*.yaml` | Per-environment promotion: dev (auto), beta/prod (manual, retag-only) |
| `kind-config.yaml` | Local Kubernetes cluster config with ingress ports mapped, for testing Path C for free |

## Running everything locally (no cloud needed)

```bash
docker compose up --build
# Python app:  http://localhost:8080/healthz
# Java service: http://localhost:8081/healthz
```

## Path B — free-tier EC2 walkthrough

1. **Create the AWS account.** Choose the Free Plan. Immediately set a
   Budgets alert at $1 (Billing console → Budgets).
2. **Create an EC2 key pair** in the console (or `aws ec2 create-key-pair
   --key-name gitops-free-tier --query 'KeyMaterial' --output text >
   ~/.ssh/gitops-free-tier.pem && chmod 400 ~/.ssh/gitops-free-tier.pem`).
3. **Find your public IP**: `curl https://checkip.amazonaws.com`
4. **Provision the instance:**
   ```bash
   cd terraform-free-tier
   terraform init
   terraform apply \
     -var="key_name=gitops-free-tier" \
     -var="my_ip_cidr=<your-ip>/32"
   ```
5. **Point Ansible at it:**
   ```bash
   cd ../ansible
   ansible-galaxy collection install -r requirements.yml
   cp inventory.ini.example inventory.ini
   # edit inventory.ini: ansible_host = terraform output instance_public_ip
   ansible-playbook playbook.yml
   ```
   This installs Docker, copies `docker-compose.yml`, and brings both
   services up on the instance.
6. **Check it, then tear it down:**
   ```bash
   curl http://<instance-ip>:8080/healthz
   curl http://<instance-ip>:8081/healthz
   cd ../terraform-free-tier && terraform destroy
   ```

## Path A — Kubernetes/GitOps walkthrough

```bash
cd terraform
terraform init && terraform apply   # creates a billable EKS cluster
kubectl apply -f ../argocd/application.yaml   # after installing ArgoCD on the cluster
```

Update `argocd/application.yaml`'s `repoURL` to your own fork first. ArgoCD
then continuously syncs `k8s/overlays/prod` onto the cluster. Remember to
`terraform destroy` when you're done — this path has no free tier.

## Notes / things to harden before real production use

- `k8s/base/secret.yaml` is a placeholder — swap for Sealed Secrets, SOPS, or
  the External Secrets Operator backed by AWS Secrets Manager.
- Terraform state is local by default in both environments — for real use,
  add an S3 + DynamoDB backend (see the commented block in
  `terraform/providers.tf`).
- `terraform-free-tier`'s security group is locked to one IP (yours) — widen
  deliberately, never to `0.0.0.0/0`, if you need shared access.
- The CI workflow builds on every push to `main`; add branch protection and
  required status checks before merging in a real team setting.
