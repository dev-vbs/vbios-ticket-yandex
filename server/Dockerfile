FROM nginx:stable-alpine AS api
EXPOSE 80
CMD ["/entry.sh"]
RUN mkdir -p /app/data
HEALTHCHECK --interval=10s --timeout=5s --retries=3 CMD curl -f 127.0.0.1/shm/healthcheck.cgi || exit 1
COPY nginx/nginx.conf /etc/nginx/
COPY entry-api.sh /entry.sh
RUN sed -i 's/\r$//' /entry.sh && chmod 755 /entry.sh

FROM danuk/shm-core-base:latest AS core
COPY entry-core.sh /entry.sh
COPY app /app
RUN sed -i 's/\r$//' /entry.sh && chmod 755 /entry.sh \
    && find /app -type f \( -name '*.sh' -o -name '*.pl' -o -name '*.cgi' \) \
       -exec sed -i 's/\r$//' {} \; -exec chmod 755 {} \;
