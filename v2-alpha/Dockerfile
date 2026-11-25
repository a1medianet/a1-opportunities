FROM node:24-alpine
WORKDIR /app
COPY alpha.mjs foundation.mjs commission.mjs provision.mjs ./
USER node
ENV PORT=13182 DB_PATH=/data/alpha.sqlite
EXPOSE 13182
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:13182/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node","alpha.mjs"]
