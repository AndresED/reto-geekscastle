## 1. HTTP throttle test

- [x] 1.1 Add Nest HTTP test with throttler config suitable for fast assertion (low limit or mocked storage)
- [x] 1.2 Assert excess `POST /api/v1/users` returns 429
- [x] 1.3 Assert `GET /api/v1/health` is not rejected solely by create write throttle

## 2. Wiring

- [x] 2.1 Ensure test uses real Throttler guard registration path (not a stub that skips the guard)
- [x] 2.2 Document how to run the test (part of `npm test` / targeted path)
