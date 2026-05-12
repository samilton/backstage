# Tasks for the Backstage app + catalog event bridge.
# Run `just` with no args to list everything.

set shell := ["bash", "-cu"]

# nsqd HTTP endpoint, used for stats/publish helpers.
nsqd_http := "http://localhost:4151"
# nsqlookupd HTTP endpoint, used for topic introspection.
lookupd_http := "http://localhost:4161"

# Default: list tasks.
default:
    @just --list

# ---- bus -----------------------------------------------------------------

# Start the local NSQ stack (nsqlookupd + nsqd + nsqadmin) in the background.
up:
    docker compose up -d
    @echo "nsqadmin: http://localhost:4171"

# Stop and remove the stack + volumes.
down:
    docker compose down -v

# Tail logs from the bus.
logs:
    docker compose logs -f

# Show nsqd stats as JSON (handy for verifying messages are flowing).
stats:
    @curl -s "{{nsqd_http}}/stats?format=json" | jq '.topics[] | {topic: .topic_name, depth, message_count, channels: [.channels[] | {name: .channel_name, depth, in_flight_count, requeue_count}]}'

# List topics known to nsqlookupd.
topics:
    @curl -s "{{lookupd_http}}/topics" | jq

# Publish a synthetic event directly to NSQ (bypasses Backstage entirely).
# Useful for smoke-testing the consumer wiring; the entityRef is fake, so
# no catalog entity is created or updated as a result.
publish-test topic="catalog.events":
    @curl -s -X POST -H 'content-type: application/cloudevents+json' \
      --data '{"specversion":"1.0","id":"test-'"$(date +%s)"'","source":"/backstage/catalog","type":"io.backstage.catalog.entity.changed","time":"'"$(date -u +%FT%TZ)"'","subject":"component:default/test","datacontenttype":"application/json","data":{"kind":"Component","specType":"service"}}' \
      "{{nsqd_http}}/pub?topic={{topic}}" \
    && echo " ok"

# Run the ops-controller consumer (subscribes to catalog.events).
# Prints the Temporal -> Pulumi plan it would execute for namespace events.
ops-controller:
    @[ -d node_modules/nsqjs ] || yarn install
    yarn workspace ops-controller start

# Tail every message published to the catalog topic. Uses an ephemeral
# channel so it does not steal messages from real consumers.
tail topic="catalog.events":
    docker run --rm -it --network backstage_default nsqio/nsq:v1.3.0 \
      nsq_tail --lookupd-http-address=nsqlookupd:4161 \
      --topic={{topic}} --channel=tail#ephemeral

# ---- backstage -----------------------------------------------------------

# Install JS deps.
install:
    yarn install

# Run the Backstage app + backend (foreground).
start:
    yarn start

# Bring up the bus, install deps if needed, then run Backstage.
# Secrets in .env (e.g. K8S_ORBSTACK_SA_TOKEN) are loaded by `yarn start`
# itself via dotenv-cli, so this works for plain `yarn start` too.
dev: up
    @[ -d node_modules ] || yarn install
    yarn start

# Mint a fresh OrbStack k8s service-account token and write it to .env.
# Run this once a year (or whenever the token expires / is revoked).
k8s-token:
    @kubectl --context orbstack -n kube-system get sa backstage >/dev/null 2>&1 || { \
        kubectl --context orbstack -n kube-system create serviceaccount backstage; \
        kubectl --context orbstack create clusterrolebinding backstage-admin \
            --clusterrole=cluster-admin --serviceaccount=kube-system:backstage; \
    }
    @TOKEN=$(kubectl --context orbstack -n kube-system create token backstage --duration=8760h); \
        touch .env; \
        sed -i.bak '/^K8S_ORBSTACK_SA_TOKEN=/d' .env && rm -f .env.bak; \
        echo "K8S_ORBSTACK_SA_TOKEN=$TOKEN" >> .env; \
        echo "wrote K8S_ORBSTACK_SA_TOKEN to .env ($(echo -n $TOKEN | wc -c | tr -d ' ') chars)"

# Run the JS test suite.
test:
    yarn test

# ---- combined ------------------------------------------------------------

# Bring everything down (bus only — yarn start is foreground anyway).
stop: down

# ---- demo stack (NSQ + Temporal + Backstage + ops-controller) ------------
#
# These tasks coordinate the two repos. They assume `ops-controller/` is a
# sibling directory of `backstage/` (the layout AGENTS.md describes). The
# three foreground processes (Backstage, consumer, worker) intentionally
# stay foreground so their logs don't mash together — stack-up just makes
# sure the docker-compose bits underneath them are running.

ops_controller_dir := "../ops-controller"
temporal_ui := "http://localhost:8233"
nsqadmin_ui := "http://localhost:4171"

# Bring up NSQ (this repo) and Temporal (../ops-controller) docker stacks.
# Idempotent — safe to run repeatedly. Prints the three foreground
# commands you still need to start by hand.
stack-up:
    @echo "→ NSQ stack (backstage/docker-compose.yml)"
    @docker compose up -d
    @curl -fsS -X POST "{{nsqd_http}}/topic/create?topic=ops.requests" >/dev/null || true
    @curl -fsS -X POST "{{nsqd_http}}/topic/create?topic=ops.responses" >/dev/null || true
    @echo
    @echo "→ Temporal stack ({{ops_controller_dir}}/docker-compose.yml)"
    @if [ ! -d {{ops_controller_dir}} ]; then \
        echo "  !! {{ops_controller_dir}} not found — clone it as a sibling of backstage/"; \
        exit 1; \
    fi
    @cd {{ops_controller_dir}} && docker compose up -d
    @echo
    @echo "✅ docker stacks up:"
    @echo "   nsqadmin:    {{nsqadmin_ui}}"
    @echo "   temporal UI: {{temporal_ui}}"
    @echo
    @echo "Now start the three foreground processes (each in its own terminal):"
    @echo
    @echo "   # 1. Backstage app + backend"
    @echo "   cd $(pwd) && yarn start"
    @echo
    @echo "   # 2. ops-controller NSQ -> Temporal consumer"
    @echo "   cd {{ops_controller_dir}} && just run"
    @echo
    @echo "   # 3. ops-controller Temporal worker"
    @echo "   cd {{ops_controller_dir}} && just worker"

# Stop both docker stacks. Foreground processes you Ctrl-C yourself.
stack-down:
    @echo "→ NSQ stack down"
    @docker compose down
    @if [ -d {{ops_controller_dir}} ]; then \
        echo "→ Temporal stack down"; \
        cd {{ops_controller_dir}} && docker compose down; \
    fi

# Quick health snapshot of the demo stack.
stack-status:
    @echo "== docker (this repo) =="
    @docker compose ps 2>/dev/null || echo "  (no compose project here)"
    @echo
    @echo "== docker (ops-controller) =="
    @if [ -d {{ops_controller_dir}} ]; then \
        cd {{ops_controller_dir}} && docker compose ps; \
    else \
        echo "  {{ops_controller_dir}} not found"; \
    fi
    @echo
    @echo "== nsqlookupd topics =="
    @curl -fsS "{{lookupd_http}}/topics" 2>/dev/null | jq . || echo "  (nsqlookupd not reachable on {{lookupd_http}})"
    @echo
    @echo "== temporal frontend =="
    @curl -fsS -o /dev/null -w "  http %{http_code} from temporal UI {{temporal_ui}}\n" "{{temporal_ui}}/" \
        || echo "  (temporal UI not reachable on {{temporal_ui}})"
