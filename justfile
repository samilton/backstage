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
