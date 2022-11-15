# This dockerfile builds an image for the backend package.
# It should be executed with the root of the repo as docker context.
#
# Before building this image, be sure to have run the following commands in the repo root:
#
# yarn install
# yarn tsc
# yarn build
#
# Once the commands have been run, you can build the image using `yarn build-image`

FROM node:16-bullseye-slim

# Install sqlite3 dependencies. You can skip this if you don't use sqlite3 in the image,
# in which case you should also move better-sqlite3 to "devDependencies" in package.json.
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        libsqlite3-dev \
        python3 \
        ca-certificates \
        curl \
        dos2unix \
        build-essential && \
    yarn config set python /usr/bin/python3

# get Elliott certificates
RUN for cert_name in EMC-PA-Root-CA.crt EMC-NY-CA01.crt EMC-PA-CA01.crt; do \
        curl --insecure \
            -o "/usr/local/share/ca-certificates/${cert_name}" \
            "https://artifactory.elliottmgmt.com/artifactory/file-store/elliott-ssl-certificates/${cert_name}"; \
        dos2unix "/usr/local/share/ca-certificates/${cert_name}"; \
    done && \
    update-ca-certificates

# From here on we use the least-privileged `node` user to run the backend.
USER node

RUN npm config set cafile /etc/ssl/certs/ca-certificates.crt && \
    npm config set registry https://artifactory.elliottmgmt.com/artifactory/api/npm/npm-virtual/
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

# This should create the app dir as `node`.
# If it is instead created as `root` then the `tar` command below will fail: `can't create directory 'packages/': Permission denied`.
# If this occurs, then ensure BuildKit is enabled (`DOCKER_BUILDKIT=1`) so the app dir is correctly created as `node`.
WORKDIR /app

# This switches many Node.js dependencies to production mode.
ENV NODE_ENV production

# Copy repo skeleton first, to avoid unnecessary docker cache invalidation.
# The skeleton contains the package.json of each package in the monorepo,
# and along with yarn.lock and the root package.json, that's enough to run yarn install.
COPY --chown=node:node yarn.lock package.json packages/backend/dist/skeleton.tar.gz ./
RUN tar xzf skeleton.tar.gz && rm skeleton.tar.gz

RUN --mount=type=cache,target=/home/node/.cache/yarn,sharing=locked,uid=1000,gid=1000 \
    yarn install --frozen-lockfile --production --network-timeout 300000

# Then copy the rest of the backend bundle, along with any other files we might want.
COPY --chown=node:node packages/backend/dist/bundle.tar.gz app-config*.yaml ./
RUN tar xzf bundle.tar.gz && rm bundle.tar.gz

CMD ["node", "packages/backend", "--config", "app-config.yaml", "--config", "app-config.production.yaml"]
