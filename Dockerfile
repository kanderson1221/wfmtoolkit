FROM node:20-alpine AS frontend-build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src

RUN npm run build


FROM rust:1.99-bookworm AS backend-build

WORKDIR /app
COPY rust ./rust
RUN cargo build --manifest-path rust/Cargo.toml --locked --release -p wfm-server


FROM python:3.11-slim-bookworm AS runtime

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend /app/backend
COPY --from=backend-build /app/rust/target/release/wfm-server /usr/local/bin/wfm-server
COPY --from=frontend-build /app/dist /app/dist

EXPOSE 10000

CMD ["python", "-m", "backend.run_native"]
