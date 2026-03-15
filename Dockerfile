FROM node:22-alpine AS web-builder

WORKDIR /app
RUN corepack enable

ARG DOCS_BASE_PATH=/
ENV DOCS_BASE_PATH=${DOCS_BASE_PATH}

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM nginx:1.27-alpine
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=web-builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
