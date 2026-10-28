FROM nginx:1.28-alpine
COPY frontend/ /usr/share/nginx/html/
# A imagem usa a mesma origem do navegador, passando a API pelo gateway.
RUN printf "export const config = { apiBaseUrl: '' };\n" > /usr/share/nginx/html/config.js
COPY infra/containers/frontend.conf.template /etc/nginx/templates/default.conf.template
ENV API_UPSTREAM=backend-lb:8080
ENV DNS_RESOLVER=127.0.0.11
ENV TRUSTED_PROXY_CIDR=127.0.0.1/32
EXPOSE 80
