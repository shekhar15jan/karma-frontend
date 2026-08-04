FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG BUILD_STAMP
RUN BUILD_STAMP_VALUE="${BUILD_STAMP:-$(date +%s)}" \
 && npm run build \
 && echo "{\"version\":\"${BUILD_STAMP_VALUE}\"}" > dist/browser/version.json

FROM nginx:alpine AS runner

RUN apk add --no-cache curl

COPY --from=build /app/dist/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=30s \
    CMD curl -f http://localhost:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
