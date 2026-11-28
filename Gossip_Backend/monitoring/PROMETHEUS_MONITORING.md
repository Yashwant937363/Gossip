# Prometheus Monitoring Guide — Gossip Backend

This guide explains **why** and **how** Prometheus monitoring is built in `Gossip_Backend`, step by step, in simple technical terms.

---

## 1. Why Are We Adding Prometheus?

When a backend runs in production, `console.log` or Pino logs tell you **what happened** for a single request, but they don't easily show you **how healthy the whole server is over time**.

Prometheus solves this by collecting **numerical measurements (metrics)** every few seconds so you can answer questions like:
- Is the server's CPU or RAM spiking?
- Are normal API routes fast while AI routes are timing out?
- How many users are currently connected via Socket.io?
- Which specific socket event (`sendMessage`, `videoCallOutgoing`, etc.) is slow or failing?
- What is the **error rate of the entire application** right now?

### The 3 Metric Types We Use (`@prometheus-io/client`)
1. **Counter** — A number that only goes **up** (e.g., total HTTP requests, total errors). Prometheus uses `rate()` on counters to calculate **requests per second (RPS)**.
2. **Gauge** — A number that can go **up and down** (e.g., currently active HTTP requests, currently connected sockets, RAM usage).
3. **Histogram** — Groups measurements (like response time) into **buckets** (e.g., `< 10ms`, `< 50ms`, `< 500ms`, `< 5s`). From buckets, Prometheus calculates **P90, P95, P99** and **Average Response Time**.

---

## 2. Step 1: Organizing the Metrics Code

Instead of putting everything into one giant file, we split the code by responsibility:

| File | Purpose |
| :--- | :--- |
| [metrics.types.ts](file:///home/yashwant/MyProject/Gossip/Gossip_Backend/types/metrics.types.ts) | Shared TypeScript types (`HttpRouteType`, `AppErrorSource`, `SocketConnectionErrorReason`, `SocketEventErrorInfo`, etc.) so metric labels stay strictly typed and typo-free. |
| [registry.ts](file:///home/yashwant/MyProject/Gossip/Gossip_Backend/metrics/registry.ts) | Creates the central Prometheus `register`, enables Node.js default metrics, and defines app-wide counters (`app_errors_total`, `app_operations_total`). |
| [http.metrics.ts](file:///home/yashwant/MyProject/Gossip/Gossip_Backend/metrics/http.metrics.ts) | Defines HTTP metrics for **Normal Routes** and **AI Routes** + `recordHttpRequest()`. |
| [socket.metrics.ts](file:///home/yashwant/MyProject/Gossip/Gossip_Backend/metrics/socket.metrics.ts) | Defines **Socket Connection** and **Socket Event** metrics + helper functions. |
| [index.ts](file:///home/yashwant/MyProject/Gossip/Gossip_Backend/metrics/index.ts) | Barrel file that re-exports everything from `registry`, `http.metrics`, and `socket.metrics` for clean imports. |

### Why Use a Dedicated `Registry`?
Creating `export const register = new Registry()` (instead of only relying on the global default) makes unit testing clean—each test can call `register.resetMetrics()` without polluting other tests or throwing duplicate-metric errors.

---

## 3. Step 2: System & Runtime Metrics (CPU, RAM, Event Loop Lag)

In [registry.ts](file:///home/yashwant/MyProject/Gossip/Gossip_Backend/metrics/registry.ts), calling `collectDefaultMetrics({ register })` automatically tracks Node.js health:

- **CPU (`process_cpu_user_seconds_total`, `process_cpu_system_seconds_total`)**: Shows how much CPU time your Node.js process is using. High CPU means heavy computation or JSON/encryption bottlenecks.
- **RAM (`process_resident_memory_bytes`, `nodejs_heap_size_used_bytes`)**: Tracks total process memory (RSS) and V8 JavaScript heap. A steady upward climb without dropping indicates a memory leak.
- **Event Loop Lag (`nodejs_eventloop_lag_seconds`)**: Measures how long callbacks wait in Node's event loop before running. Because Node.js is single-threaded, high event loop lag means something synchronous is blocking the server and slowing down *all* users.

---

## 4. Step 3: HTTP Monitoring (Normal Routes vs. AI Routes)

Implemented in [metrics.middleware.ts](file:///home/yashwant/MyProject/Gossip/Gossip_Backend/middlewares/metrics.middleware.ts) and wired in [app.ts](file:///home/yashwant/MyProject/Gossip/Gossip_Backend/app.ts).

### Why Separate Normal Routes and AI Routes?
- **Normal routes** (`/api/auth/*`, `/api/chat/*`, `/api/user/*`) usually finish in **5ms to 500ms**. Their histogram buckets are `[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]` seconds.
- **AI routes** (`/api/ai/*` — chatbot, image analysis, translation, summarization) call external LLM APIs (Groq) and often take **1s to 30s+**. If they shared normal buckets, almost every AI request would fall into the top bucket, making P90/P95/P99 inaccurate. So AI routes get their own `ai_request_duration_seconds` histogram with buckets `[0.1, 0.5, 1, 2, 5, 10, 15, 20, 30, 45, 60]` seconds.

### How `metricsMiddleware` Works
1. **Skip `/metrics`**: Prometheus scrapes `GET /metrics` every 5 seconds. Skipping it prevents monitoring traffic from inflating your API stats.
2. **Track In-Flight Requests (`http_active_requests`)**: Increments when a request enters, decrements when it finishes. This shows how many requests are running *concurrently* right now.
3. **High-Resolution Timer**: Uses `process.hrtime.bigint()` (nanosecond precision) to measure exact duration.
4. **Prevent Label Explosion (`resolveRouteLabel`)**: Uses Express's matched pattern (`req.baseUrl + req.route.path`, e.g., `/api/user/search`) or `"unmatched"` for random 404s. Never use raw URLs with IDs/query params as Prometheus labels, or memory will grow endlessly.
5. **Safe Cleanup (`settled` flag on `finish` & `close`)**: Listens to both `res.on("finish")` (normal completion) and `res.on("close")` (client disconnected early, recorded as status `499`) with a `settled` boolean so `http_active_requests` is never double-decremented.
6. **Expose `GET /metrics`**: In [app.ts](file:///home/yashwant/MyProject/Gossip/Gossip_Backend/app.ts), `GET /metrics` returns `await register.metrics()` with `register.contentType` so Prometheus can scrape it.

---

## 5. Step 4: Socket Connection Monitoring

Implemented in [authSocket.middleware.ts](file:///home/yashwant/MyProject/Gossip/Gossip_Backend/middlewares/authSocket.middleware.ts) and [index.ts](file:///home/yashwant/MyProject/Gossip/Gossip_Backend/index.ts).

### Why Track Connections Separately from Events?
A WebSocket connection is **long-lived** (minutes or hours), unlike an HTTP request (milliseconds). Tracking connections tells you:
- How many users are online right now (`socket_active_connections`).
- Whether users are failing to authenticate (`socket_connection_errors_total` with `reason`: `missing_token`, `invalid_token`, `user_not_found`).
- How long handshake auth and session setup take before the socket is ready (`socket_handshake_duration_seconds`).

### How It Works
1. **Handshake Attempt (`authSocket`)**: Calls `recordSocketConnectionAttempt()` and records `socket.data.handshakeStartedAt` as soon as a client tries to connect.
2. **Auth Rejection**: If token is missing, invalid, or user is not found, calls `recordSocketConnectionError(reason)` (which also increments `app_errors_total`).
3. **Connected (`onConnection` in `index.ts`)**: Calls `recordSocketConnect()` to increment `socket_connected_total` and `socket_active_connections`, runs `setupUserSession`, registers handlers, and then calls `recordSocketHandshakeDuration(...)` to record the total handshake + setup latency.
4. **Disconnected (`socket.on("disconnect")`)**: Calls `recordSocketDisconnect()` to decrement `socket_active_connections`.

---

## 6. Step 5: Socket Event Monitoring & Error Handling

Implemented in [on-socket-event.ts](file:///home/yashwant/MyProject/Gossip/Gossip_Backend/utils/on-socket-event.ts) and [socket-error-handler.ts](file:///home/yashwant/MyProject/Gossip/Gossip_Backend/utils/socket-error-handler.ts), and used across all socket files (`chat.socket.ts`, `call.socket.ts`, `settings.socket.ts`, `user.socket.ts`).

### Why `socket.use()` Middleware Is Not Enough
Socket.io has `socket.use(([event, ...args], next) => ...)`, which runs *before* your event handler starts. Calling `next()` does **not** `await` your `async` handler—so `socket.use()` cannot catch async errors thrown inside `sendMessage`, cannot measure how long the handler took, and cannot reply to the client's `ack` callback.

### How `onSocketEvent` + `handleSocketError` Work
Instead of calling raw `socket.on(...)` in every socket file, all handlers use `onSocketEvent(socket, eventName, handler)` which keeps **error handling** and **metrics** cleanly separated:

1. **`handleSocketError(socket, eventName, error, args)`** (in [socket-error-handler.ts](file:///home/yashwant/MyProject/Gossip/Gossip_Backend/utils/socket-error-handler.ts)):
   - Checks if `error instanceof AppError && error.isOperational`.
   - Logs a `warn` for operational errors (e.g., empty message) or `error` for unexpected crashes.
   - Sends the error back to the client via `ack(socketError(...))` if an ack callback exists, or `socket.emit(ServertoClientEvents.ErrorMessage, ...)`.
   - Returns `{ code, isOperational }`.
2. **`onSocketEvent(socket, eventName, handler)`** (in [on-socket-event.ts](file:///home/yashwant/MyProject/Gossip/Gossip_Backend/utils/on-socket-event.ts)):
   - Registers `socket.on(eventName, ...)`.
   - Increments `socket_active_events` and starts a timer.
   - Runs `await handler(...args)` inside `try / catch / finally`.
   - On error, calls `handleSocketError(...)` to notify the client and capture `{ code, isOperational }`.
   - In `finally`, decrements `socket_active_events` and calls `recordSocketEvent(eventName, durationSeconds, errorInfo)` to update `socket_events_total`, `socket_event_duration_seconds`, `socket_event_errors_total` (`error_type`: `"operational"` vs `"unhandled"`), and `app_errors_total` (`severity`: `"warn"` vs `"error"`).

---

## 7. Whole-Application Error Rate

Every subsystem (Normal HTTP, AI HTTP, Socket Connections, Socket Events) reports to two shared counters in [registry.ts](file:///home/yashwant/MyProject/Gossip/Gossip_Backend/metrics/registry.ts):
- **`app_operations_total{type}`**: Incremented for every HTTP request, AI request, socket connection attempt, and socket event.
- **`app_errors_total{source, severity}`**: Incremented whenever any of those operations fails.

This lets you see the **overall health of the entire backend** in a single percentage, and immediately drill down into *which* `source` (`http`, `ai`, `socket_conn`, `socket_event`) is causing errors.

---

## 8. How Prometheus Calculates P90, P95, P99, Avg, RPS & Error Rate

- **P90 / P95 / P99 (Percentiles)**:
  "P95 = 200ms" means **95% of requests finished in 200ms or less**, and the slowest 5% took longer. Averages can hide slow requests; percentiles reveal them.
  ```promql
  histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{type="normal"}[1m])) by (le))
  ```
- **Average Response Time (ms)**:
  Histograms automatically track `_sum` (total time) and `_count` (total requests). Dividing them gives the average:
  ```promql
  (sum(rate(http_request_duration_seconds_sum{type="normal"}[1m])) by (route, method) /
   sum(rate(http_request_duration_seconds_count{type="normal"}[1m])) by (route, method)) * 1000
  ```
- **Request Throughput (RPS by Route / Event)**:
  `rate(...[1m])` calculates per-second rate over the last 1 minute:
  ```promql
  sum(rate(http_requests_total{type="normal"}[1m])) by (route, method)
  sum(rate(socket_events_total[1m])) by (event)
  ```
- **Error Rate (%)**:
  ```promql
  (sum(rate(app_errors_total[1m])) or vector(0)) /
  (sum(rate(app_operations_total[1m])) or vector(1)) * 100
  ```
  *(Using `or vector(0)` prevents "No Data" in Grafana when there are 0 errors.)*

---

## 9. Step 6: Prometheus & Grafana Infrastructure *(Upcoming)*

Inside `Gossip_Backend/monitoring/`:
- **`prometheus.yml`**: Tells Prometheus to scrape `host.docker.internal:5000/metrics` every `5s`.
- **`docker-compose.yml`**: Runs Prometheus (`:9090`) and Grafana (`:3001`) with `extra_hosts: ["host.docker.internal:host-gateway"]` so Docker containers can reach your local backend.
- **`grafana/provisioning/dashboards/`**: Pre-loads a Grafana dashboard with panels for System Health, Entire App Error Rate, Normal Routes, AI Routes, Socket Connections, and Socket Events.
