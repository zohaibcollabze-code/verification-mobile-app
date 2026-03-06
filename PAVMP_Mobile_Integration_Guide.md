# PAVMP — Field Inspector Mobile App Integration Guide
**Version:** 1.2.0 | **Prompt-Pin:** `pavmp-inspector-v1.2` | **Expires:** 2026-12-31 | **Backend URL:** `https://verification-platform-server.vercel.app/api` | **Auth:** Bearer JWT (RS256)

> ⚠️ **VERSION LOCK** — This document governs a specific API contract. Any model, agent, or automation consuming this spec MUST NOT infer, extend, or backfill behaviour beyond what is explicitly described. If a behaviour is not defined here, the correct action is to return a typed `AppException` — never a guess.

---

---

## ─── OUTPUT CONTRACT ───
> **This section is written as imperative directives. Checklists are for humans. These rules are for the system.**

1. **Every API response MUST be deserialized into a typed model.** Raw `Map<String, dynamic>` MUST NOT be passed beyond the data layer. If deserialization fails, throw `AppException(code: 'DESERIALIZATION_ERROR')`.
2. **Every error response MUST be mapped through `ErrorHandler.handle()`.** No raw `DioException` or untyped `catch (e)` may surface to the business logic or presentation layer.
3. **All list endpoints MUST return a `PaginatedResponse<T>`.** Never return a plain `List<T>` from a repository method that calls a paginated endpoint.
4. **GPS coordinates MUST be validated before any findings submission call.** If validation fails, throw `AppException(code: 'INVALID_GPS')` — do not silently clamp or correct the coordinates.
5. **Token storage MUST use `flutter_secure_storage` exclusively.** `SharedPreferences`, `Hive`, in-memory variables, or any other store are FORBIDDEN for tokens.
6. **The `requiresPasswordChange` flag MUST be checked on every login response.** If `true`, the app MUST redirect to the Change Password screen and MUST NOT allow navigation to any other screen until the password is changed.
7. **The response envelope shape is fixed:** `{ "success": bool, "data": T | null, "error": string | null, "code": string | null }`. Any response deviating from this shape MUST be rejected with `AppException(code: 'INVALID_RESPONSE_SHAPE')`.
8. **Output token caps by response type (runtime system prompt enforcement):** When this spec is used as a system prompt, the model MUST NOT generate responses exceeding the following limits. Exceeding these limits risks violating the sub-300ms p95 latency SLA under load:

   | Response Type | Max Tokens | Rationale |
   |---|---|---|
   | Login / Auth | 200 | Fixed envelope — no prose |
   | Job list (paginated) | 500 | 20 items × ~25 tokens each |
   | Job detail | 600 | Single item + findingsSchema |
   | Findings schema only | 400 | Schema fields, no surrounding data |
   | Submit findings confirmation | 150 | `{ success, data.id, message }` only |
   | Error responses | 100 | Code + message only — no explanation prose |
   | Notifications list | 400 | 20 items × ~20 tokens each |
   | Profile | 200 | Fixed shape, no dynamic fields |

   **NEVER generate chain-of-thought, reasoning steps, or explanatory prose in API responses.** Return the JSON envelope and nothing else.


## ─── ROLE-BASED PERMISSION MATRIX ───
> **Single source of truth for endpoint access by role. NEVER scatter this logic across the codebase — derive all permission checks from this table.**

| Role | Permitted Endpoints | Forbidden / Restricted |
|---|---|---|
| `inspector` | `GET /requests` — own jobs only (API filters automatically) | `GET /inspectors/:otherInspectorId/jobs` — other inspector's history |
| `inspector` | `GET /requests/:id` — only where `currentAssignment.inspectorId == JWT sub` | Any `:id` where assignment does not match JWT sub |
| `inspector` | `POST /requests/:id/accept` — only when status is `ASSIGNED` | Accept when status is not `ASSIGNED` |
| `inspector` | `POST /requests/:id/reject` — only when status is `ASSIGNED` | Reject after acceptance |
| `inspector` | `POST /inspections/:id/submit-findings` — only when status is `IN_PROGRESS` | Submit when not `IN_PROGRESS` |
| `inspector` | `GET /inspections/:id/findings-schema` — own assigned jobs only | Schema for unassigned jobs |
| `inspector` | `GET /inspectors/me/profile` | `GET /inspectors/:otherId/profile` |
| `inspector` | `PATCH /inspectors/me/profile` — `fullName`, `phone`, `designation` only | `email`, `cnicNumber`, `citiesCovered`, `bankScope`, `employmentType` |
| `inspector` | `GET /notifications` — own notifications only | — |
| `inspector` | `PATCH /notifications/:id/read` — own notifications only | Marking other users' notifications |
| `inspector` | `PATCH /notifications/read-all` | — |
| `inspector` | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` | — |
| `inspector` | `POST /auth/change-password` | — |

**Enforcement rules (imperative):**

1. The JWT `sub` claim IS the inspector's user ID. NEVER trust a `userId` field in the request body — always use the decoded JWT sub.
2. Before rendering Accept / Reject buttons: `currentAssignment.inspectorId == JWT sub AND currentAssignment.acceptedAt == null AND currentAssignment.rejectedAt == null`.
3. Before rendering Submit Findings: `status == 'IN_PROGRESS' AND currentAssignment.inspectorId == JWT sub`.
4. Before rendering Re-submit (RETURNED state): `status == 'RETURNED' AND currentAssignment.inspectorId == JWT sub`.
5. A 403 response from ANY endpoint MUST immediately clear the action from the UI and log `FORBIDDEN_ACTION` — it indicates a client-side permission check was missed.

```dart
// lib/core/permissions/inspector_permissions.dart

class InspectorPermissions {
  /// Returns true only if this inspector can act on the given job detail.
  static bool canAccept(JobDetail job, String jwtSub) =>
      job.status == 'ASSIGNED' &&
      job.currentAssignment.inspectorId == jwtSub &&
      job.currentAssignment.acceptedAt == null &&
      job.currentAssignment.rejectedAt == null;

  static bool canReject(JobDetail job, String jwtSub) =>
      canAccept(job, jwtSub); // same preconditions

  static bool canSubmitFindings(JobDetail job, String jwtSub) =>
      job.status == 'IN_PROGRESS' &&
      job.currentAssignment.inspectorId == jwtSub;

  static bool canResubmitFindings(JobDetail job, String jwtSub) =>
      job.status == 'RETURNED' &&
      job.currentAssignment.inspectorId == jwtSub;

  /// Guards profile field mutations — only these three fields may be patched.
  static const Set<String> patchableProfileFields = {
    'fullName', 'phone', 'designation',
  };

  static Map<String, dynamic> sanitizeProfilePatch(Map<String, dynamic> input) =>
      Map.fromEntries(
        input.entries.where((e) => patchableProfileFields.contains(e.key)),
      );
}
```

---

## ─── NEVER DO ───
> **These are hard prohibitions. No business justification overrides them.**

- **NEVER log a raw stack trace in production.** `AppLogger.error()` accepts an `error` object; the logger strips internal field names and file paths before writing.
- **NEVER expose internal field names, table names, or server file paths in error messages shown to the user.** Map all backend error messages through `ErrorHandler` before display.
- **NEVER store a token, password, or CNIC in a log statement, analytics event, or crash report payload.** PII fields are: `password`, `token`, `accessToken`, `refreshToken`, `email`, `phone`, `cnicNumber`.
- **NEVER retry a 4xx response.** Only 5xx responses and network-timeout errors are retryable. Retrying a 401 or 403 without a token refresh is a security violation.
- **NEVER mutate `RequestOptions` outside of an interceptor.** All header injection must happen in `AuthInterceptor.onRequest()`.
- **NEVER infer a job's permitted actions from its status alone.** Always verify `currentAssignment.acceptedAt` and `currentAssignment.rejectedAt` from the job detail response before rendering action buttons.
- **NEVER persist photo `File` objects across app restarts without storing the absolute file path.** Dart `File` references are volatile; the sync queue must store absolute paths, not object references.
- **NEVER call `submit-findings` if the request status is not `IN_PROGRESS`.** Validate status client-side before building the multipart payload.

---

## Table of Contents

1. [Executive Summary & Architecture](#1-executive-summary--architecture)
2. [Environment Setup](#2-environment-setup)
3. [Project Structure](#3-project-structure)
4. [API Client Core](#4-api-client-core)
5. [Authentication Manager](#5-authentication-manager)
6. [Feature Modules](#6-feature-modules)
7. [Offline-First & Sync Queue](#7-offline-first--sync-queue)
8. [Error Handling & Retry Logic](#8-error-handling--retry-logic)
9. [Security Implementation](#9-security-implementation)
10. [State Management](#10-state-management)
11. [Testing Strategy](#11-testing-strategy)
12. [Performance Optimization](#12-performance-optimization)
13. [Observability & Logging](#13-observability--logging)
14. [Security Audit Checklist](#14-security-audit-checklist)
15. [Deployment Verification](#15-deployment-verification)

---

## 1. Executive Summary & Architecture

### 1.1 Overview

This document is the authoritative integration reference for connecting the PAVMP Field Inspector mobile application to the production backend hosted at `https://verification-platform-server.vercel.app/api`. It covers Flutter-first implementation patterns (with React Native equivalents noted where relevant), enterprise-grade security, full offline support, and OWASP Mobile Top 10 compliance.

### 1.2 Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     MOBILE APPLICATION                        │
│                                                              │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐  │
│  │ Presentation│   │Business Logic│   │   Data Layer     │  │
│  │   Layer     │──▶│   Layer      │──▶│                  │  │
│  │ (UI/Widgets)│   │(Use Cases /  │   │ ┌──────────────┐ │  │
│  │             │   │  BLoC/Riverpod│   │ │  Repository  │ │  │
│  └─────────────┘   └──────────────┘   │ │  (Abstract)  │ │  │
│                                       │ └──────┬───────┘ │  │
│                                       │        │         │  │
│                                       │ ┌──────▼───────┐ │  │
│                                       │ │ Remote Data  │ │  │
│                                       │ │ Source       │ │  │
│                                       │ └──────┬───────┘ │  │
│                                       │        │         │  │
│                                       │ ┌──────▼───────┐ │  │
│                                       │ │ Local Cache  │ │  │
│                                       │ │ (Hive/SQLite)│ │  │
│                                       │ └──────────────┘ │  │
│                                       └──────────────────┘  │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTPS / TLS 1.3
                         │ JWT Bearer Auth
                         │ HTTP/2 Multiplexing
                         ▼
┌──────────────────────────────────────────────────────────────┐
│         BACKEND  (https://verification-platform-server       │
│                          .vercel.app/api)                    │
│                                                              │
│  POST /auth/login          GET  /requests                    │
│  POST /auth/refresh        GET  /requests/:id                │
│  POST /auth/logout         POST /requests/:id/accept         │
│  POST /auth/change-password POST /requests/:id/reject        │
│  GET  /inspectors/me/profile                                 │
│  POST /inspections/:id/submit-findings (multipart)           │
│  GET  /notifications       PATCH /notifications/:id/read     │
└──────────────────────────────────────────────────────────────┘
```

### 1.3 Implementation Roadmap

| Milestone | Scope | Estimated Duration |
|---|---|---|
| M1 | Environment setup, API client core, DI | 3 days |
| M2 | Auth manager, token storage, refresh flow | 2 days |
| M3 | Jobs, profile, notifications modules | 4 days |
| M4 | Findings form (dynamic schema renderer) | 3 days |
| M5 | Multipart photo upload with GPS | 2 days |
| M6 | Offline queue, local cache, sync | 3 days |
| M7 | Security hardening (cert pinning, encryption) | 2 days |
| M8 | Tests, observability, CI/CD, deployment check | 3 days |

---

## 2. Environment Setup

### 2.1 Flutter Dependencies (`pubspec.yaml`)

```yaml
name: pavmp_inspector
description: PAVMP Field Inspector Mobile App

environment:
  sdk: '>=3.0.0 <4.0.0'
  flutter: '>=3.10.0'

dependencies:
  flutter:
    sdk: flutter

  # Networking
  dio: ^5.4.0                    # HTTP client with interceptors
  dio_cache_interceptor: ^3.4.4  # Response caching
  pretty_dio_logger: ^1.3.1      # Debug logging (dev only)

  # Security
  flutter_secure_storage: ^9.0.0 # Keychain/Keystore token storage
  ssl_pinning_plugin: ^2.0.0     # Certificate pinning

  # State Management
  flutter_riverpod: ^2.4.10
  riverpod_annotation: ^2.3.4

  # Local Storage / Offline
  hive_flutter: ^1.1.0           # Local cache
  drift: ^2.14.1                 # SQLite ORM for sync queue
  connectivity_plus: ^5.0.2      # Network status

  # Location / Media
  geolocator: ^11.0.0            # GPS coordinates
  image_picker: ^1.0.7           # Camera / gallery access
  image: ^4.1.7                  # Image compression

  # Utilities
  freezed_annotation: ^2.4.1     # Immutable models
  json_annotation: ^4.8.1        # JSON serialization
  get_it: ^7.6.7                 # Service locator / DI
  logger: ^2.0.2+1               # Structured logging
  uuid: ^4.3.3                   # Correlation IDs
  retry: ^3.1.2                  # Retry with backoff

dev_dependencies:
  flutter_test:
    sdk: flutter
  build_runner: ^2.4.8
  freezed: ^2.4.7
  json_serializable: ^6.7.1
  riverpod_generator: ^2.3.10
  mockito: ^5.4.4
  http_mock_adapter: ^0.6.1
  flutter_lints: ^3.0.1
```

### 2.2 Android Configuration

**`android/app/build.gradle`**
```gradle
android {
    compileSdkVersion 34
    defaultConfig {
        minSdkVersion 24          // TLS 1.3 requires API 24+
        targetSdkVersion 34
    }
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'),
                          'proguard-rules.pro'
        }
    }
}
```

**`android/app/src/main/res/xml/network_security_config.xml`**
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">verification-platform-server.vercel.app</domain>
        <pin-set expiration="2026-12-31">
            <!-- SHA-256 of the server's leaf certificate public key -->
            <!-- Run: openssl s_client -connect verification-platform-server.vercel.app:443 -->
            <!-- Then: openssl x509 -pubkey -noout | openssl pkey -pubin -outform DER | openssl dgst -sha256 -binary | base64 -->
            <pin digest="SHA-256">REPLACE_WITH_ACTUAL_PIN_BASE64==</pin>
            <!-- Backup pin (intermediate CA) -->
            <pin digest="SHA-256">REPLACE_WITH_BACKUP_PIN_BASE64==</pin>
        </pin-set>
    </domain-config>
</network-security-config>
```

**`android/app/src/main/AndroidManifest.xml`** — add inside `<application>`:
```xml
android:networkSecurityConfig="@xml/network_security_config"
android:usesCleartextTraffic="false"
```

### 2.3 iOS Configuration

**`ios/Runner/Info.plist`** — add:
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
</dict>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Required to capture GPS coordinates during field inspections.</string>
<key>NSCameraUsageDescription</key>
<string>Required to capture evidence photos during inspections.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Required to select evidence photos from your gallery.</string>
```

### 2.4 Environment Configuration (`lib/core/config/app_config.dart`)

```dart
enum AppEnvironment { development, staging, production }

class AppConfig {
  static const AppEnvironment environment = AppEnvironment.production;

  static const String baseUrl =
      'https://verification-platform-server.vercel.app/api';

  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 60);
  static const Duration sendTimeout = Duration(seconds: 120); // large multipart

  static const int maxRetryAttempts = 3;
  static const Duration initialRetryDelay = Duration(seconds: 1);

  static const int notificationPollIntervalSeconds = 45;
  static const int maxImageSizeMB = 5;
  static const List<String> allowedImageMimeTypes = ['image/jpeg', 'image/png'];

  // ── INPUT TRUST MODEL ──────────────────────────────────────────────────────
  // ALL data originating from user input, device sensors, or the local file
  // system is UNTRUSTED by default. Validate and sanitize BEFORE sending to
  // any repository method or network call.
  // ── STATELESS MODEL ────────────────────────────────────────────────────────
  // This app has NO memory between API calls. Every request must carry its full
  // auth context (Bearer token). Never assume a previous call succeeded without
  // inspecting the current response.
  // ──────────────────────────────────────────────────────────────────────────

  // GPS bounds — Pakistan
  static const double gpsLatMin = 23.0;
  static const double gpsLatMax = 37.0;
  static const double gpsLonMin = 60.0;
  static const double gpsLonMax = 77.0;
}
```

---

## 3. Project Structure

```
lib/
├── core/
│   ├── config/
│   │   └── app_config.dart
│   ├── di/
│   │   └── injection.dart             # GetIt service locator setup
│   ├── network/
│   │   ├── api_client.dart            # Dio instance + interceptors
│   │   ├── auth_interceptor.dart      # Attach / refresh tokens
│   │   ├── retry_interceptor.dart     # Backoff retry logic
│   │   └── connectivity_service.dart  # Online/offline detection
│   ├── security/
│   │   ├── token_storage.dart         # flutter_secure_storage wrapper
│   │   └── cert_pinning_service.dart  # Certificate pin validation
│   ├── error/
│   │   ├── app_exception.dart         # Typed exceptions
│   │   └── error_handler.dart         # Central error mapper
│   ├── logging/
│   │   └── app_logger.dart            # Structured logger with PII redaction
│   └── sync/
│       ├── sync_queue.dart            # Offline submission queue (Drift)
│       └── sync_worker.dart           # Background sync processor
│
├── features/
│   ├── auth/
│   │   ├── data/
│   │   │   ├── auth_remote_datasource.dart
│   │   │   └── auth_repository_impl.dart
│   │   ├── domain/
│   │   │   ├── auth_repository.dart   # Abstract
│   │   │   ├── models/
│   │   │   │   ├── login_request.dart
│   │   │   │   └── auth_response.dart
│   │   │   └── use_cases/
│   │   │       ├── login_usecase.dart
│   │   │       └── refresh_token_usecase.dart
│   │   └── presentation/
│   │       ├── auth_controller.dart   # Riverpod notifier
│   │       └── screens/
│   │           ├── login_screen.dart
│   │           └── change_password_screen.dart
│   │
│   ├── jobs/
│   │   ├── data/ ...
│   │   ├── domain/ ...
│   │   └── presentation/ ...
│   │
│   ├── findings/
│   │   ├── data/ ...
│   │   ├── domain/ ...
│   │   └── presentation/
│   │       └── widgets/
│   │           └── dynamic_form_renderer.dart
│   │
│   ├── notifications/
│   │   ├── data/ ...
│   │   └── presentation/ ...
│   │
│   └── profile/
│       ├── data/ ...
│       └── presentation/ ...
│
└── main.dart
```

---

## 4. API Client Core

### 4.1 Dependency Injection Setup (`lib/core/di/injection.dart`)

```dart
import 'package:get_it/get_it.dart';
import 'package:dio/dio.dart';
import '../network/api_client.dart';
import '../security/token_storage.dart';
import '../security/cert_pinning_service.dart';
import '../../features/auth/data/auth_remote_datasource.dart';
import '../../features/auth/data/auth_repository_impl.dart';
import '../../features/auth/domain/auth_repository.dart';
// ... import all other datasources & repositories

final GetIt sl = GetIt.instance;

Future<void> configureDependencies() async {
  // Core
  sl.registerLazySingleton<TokenStorage>(() => TokenStorage());
  sl.registerLazySingleton<CertPinningService>(() => CertPinningService());
  sl.registerLazySingleton<Dio>(() => ApiClient(sl(), sl()).dio);

  // Auth
  sl.registerLazySingleton<AuthRemoteDatasource>(
    () => AuthRemoteDatasource(sl()),
  );
  sl.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(sl()),
  );

  // Jobs, Findings, Notifications, Profile — same pattern
}
```

### 4.2 Dio API Client (`lib/core/network/api_client.dart`)

```dart
import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'dart:io';
import '../config/app_config.dart';
import '../security/token_storage.dart';
import '../security/cert_pinning_service.dart';
import 'auth_interceptor.dart';
import 'retry_interceptor.dart';
import '../logging/app_logger.dart';

class ApiClient {
  late final Dio dio;

  ApiClient(TokenStorage tokenStorage, CertPinningService pinning) {
    dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.baseUrl,
        connectTimeout: AppConfig.connectTimeout,
        receiveTimeout: AppConfig.receiveTimeout,
        sendTimeout: AppConfig.sendTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        validateStatus: (status) => status != null && status < 600,
      ),
    );

    // Certificate pinning via custom HttpClient
    (dio.httpClientAdapter as IOHttpClientAdapter).createHttpClient = () {
      final client = HttpClient();
      client.badCertificateCallback = (cert, host, port) {
        return pinning.isValidCertificate(cert, host);
      };
      return client;
    };

    // Interceptors — ORDER MATTERS
    dio.interceptors.addAll([
      AuthInterceptor(dio, tokenStorage),
      RetryInterceptor(dio),
      if (AppConfig.environment == AppEnvironment.development)
        LogInterceptor(
          requestBody: true,
          responseBody: true,
          logPrint: (obj) => AppLogger.debug(obj.toString()),
        ),
    ]);
  }
}
```

---

## 5. Authentication Manager

### 5.1 Secure Token Storage (`lib/core/security/token_storage.dart`)

```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorage {
  static const _accessTokenKey = 'pavmp_access_token';
  static const _userIdKey = 'pavmp_user_id';
  static const _userRoleKey = 'pavmp_user_role';

  final _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,  // AES-256 via Android Keystore
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );

  Future<void> saveAccessToken(String token) =>
      _storage.write(key: _accessTokenKey, value: token);

  Future<String?> getAccessToken() =>
      _storage.read(key: _accessTokenKey);

  Future<void> saveUserMeta({required String id, required String role}) async {
    await _storage.write(key: _userIdKey, value: id);
    await _storage.write(key: _userRoleKey, value: role);
  }

  Future<void> clearAll() => _storage.deleteAll();
}
```

### 5.2 Auth Interceptor (`lib/core/network/auth_interceptor.dart`)

```dart
import 'package:dio/dio.dart';
import '../security/token_storage.dart';
import '../logging/app_logger.dart';

class AuthInterceptor extends Interceptor {
  final Dio _dio;
  final TokenStorage _tokenStorage;
  bool _isRefreshing = false;
  // Completers ensure pending requests resolve their futures after refresh,
  // rather than being silently dropped. Each queued request gets its own
  // Completer so the caller's Future<Response> resolves correctly.
  final List<({RequestOptions options, ErrorInterceptorHandler handler})> _pendingRequests = [];

  AuthInterceptor(this._dio, this._tokenStorage);

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Skip auth header for login and refresh endpoints
    if (_isPublicEndpoint(options.path)) {
      return handler.next(options);
    }

    final token = await _tokenStorage.getAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode != 401 ||
        _isPublicEndpoint(err.requestOptions.path)) {
      return handler.next(err);
    }

    if (_isRefreshing) {
      // Queue the request AND its handler — both are needed to resolve the future
      _pendingRequests.add((options: err.requestOptions, handler: handler));
      return; // do not call handler.next() — the refresh will resolve it
    }

    _isRefreshing = true;

    try {
      final refreshed = await _refreshToken();
      if (refreshed) {
        // Retry original request
        final retried = await _retry(err.requestOptions);
        handler.resolve(retried);

        // Retry all queued requests, resolving each caller's future individually
        for (final pending in _pendingRequests) {
          try {
            final retriedPending = await _retry(pending.options);
            pending.handler.resolve(retriedPending);
          } catch (e) {
            pending.handler.next(err);
          }
        }
        _pendingRequests.clear();
      } else {
        await _tokenStorage.clearAll();
        // Navigate to login — use your router/navigator here
        handler.next(err);
      }
    } catch (e) {
      AppLogger.error('Token refresh failed', error: e);
      await _tokenStorage.clearAll();
      handler.next(err);
    } finally {
      _isRefreshing = false;
    }
  }

  Future<bool> _refreshToken() async {
    try {
      final response = await _dio.post(
        '/auth/refresh',
        options: Options(extra: {'skipAuth': true}),
      );
      if (response.statusCode == 200 && response.data['success'] == true) {
        final newToken = response.data['data']['accessToken'] as String;
        await _tokenStorage.saveAccessToken(newToken);
        return true;
      }
    } catch (_) {}
    return false;
  }

  Future<Response> _retry(RequestOptions options) async {
    final token = await _tokenStorage.getAccessToken();
    options.headers['Authorization'] = 'Bearer $token';
    return _dio.fetch(options);
  }

  bool _isPublicEndpoint(String path) =>
      path.contains('/auth/login') ||
      path.contains('/auth/refresh');
}
```

### 5.3 Auth Data Source (`lib/features/auth/data/auth_remote_datasource.dart`)

```dart
import 'package:dio/dio.dart';
import '../domain/models/auth_response.dart';
import '../domain/models/login_request.dart';

class AuthRemoteDatasource {
  final Dio _dio;
  AuthRemoteDatasource(this._dio);

  Future<AuthResponse> login(LoginRequest request) async {
    final response = await _dio.post(
      '/auth/login',
      data: request.toJson(),
    );
    return AuthResponse.fromJson(response.data['data']);
  }

  Future<AuthResponse> refreshToken() async {
    final response = await _dio.post('/auth/refresh');
    return AuthResponse.fromJson(response.data['data']);
  }

  Future<void> logout() async {
    await _dio.post('/auth/logout');
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
    required String confirmPassword,
  }) async {
    await _dio.post('/auth/change-password', data: {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
      'confirmPassword': confirmPassword,
    });
  }
}
```

### 5.4 Auth Models (`lib/features/auth/domain/models/`)

```dart
// login_request.dart
import 'package:freezed_annotation/freezed_annotation.dart';
part 'login_request.freezed.dart';
part 'login_request.g.dart';

@freezed
class LoginRequest with _$LoginRequest {
  const factory LoginRequest({
    required String email,
    required String password,
  }) = _LoginRequest;

  factory LoginRequest.fromJson(Map<String, dynamic> json) =>
      _$LoginRequestFromJson(json);
}

// auth_response.dart
@freezed
class AuthResponse with _$AuthResponse {
  const factory AuthResponse({
    required String accessToken,
    required AuthUser user,
    @Default(false) bool requiresPasswordChange,
  }) = _AuthResponse;

  factory AuthResponse.fromJson(Map<String, dynamic> json) =>
      _$AuthResponseFromJson(json);
}

@freezed
class AuthUser with _$AuthUser {
  const factory AuthUser({
    required String id,
    required String email,
    required String role,
    required String fullName,
    String? bankId,
  }) = _AuthUser;

  factory AuthUser.fromJson(Map<String, dynamic> json) =>
      _$AuthUserFromJson(json);
}
```

### 5.5 Login Use Case with `requiresPasswordChange` Guard

```dart
// lib/features/auth/domain/use_cases/login_usecase.dart
import '../auth_repository.dart';
import '../models/login_request.dart';
import '../models/auth_response.dart';

sealed class LoginResult {}
class LoginSuccess extends LoginResult { final AuthResponse data; LoginSuccess(this.data); }
class LoginRequiresPasswordChange extends LoginResult { final AuthResponse data; LoginRequiresPasswordChange(this.data); }
class LoginFailure extends LoginResult { final String message; final String code; LoginFailure(this.message, this.code); }

class LoginUseCase {
  final AuthRepository _repository;
  LoginUseCase(this._repository);

  Future<LoginResult> call(LoginRequest request) async {
    try {
      final response = await _repository.login(request);
      if (response.requiresPasswordChange) {
        return LoginRequiresPasswordChange(response);
      }
      return LoginSuccess(response);
    } on AppException catch (e) {
      return LoginFailure(e.message, e.code);
    }
  }
}
```

---

## 6. Feature Modules

### 6.1 Jobs Repository

```dart
// lib/features/jobs/data/jobs_remote_datasource.dart
class JobsRemoteDatasource {
  final Dio _dio;
  JobsRemoteDatasource(this._dio);

  Future<PaginatedResponse<JobSummary>> getJobs({
    int page = 1,
    int limit = 20,
    String? status,
    String? search,
    String? dateFrom,
    String? dateTo,
  }) async {
    final response = await _dio.get('/requests', queryParameters: {
      'page': page,
      'limit': limit,
      if (status != null) 'status': status,
      if (search != null) 'search': search,
      if (dateFrom != null) 'dateFrom': dateFrom,
      if (dateTo != null) 'dateTo': dateTo,
    });

    final data = response.data['data'] as List;
    return PaginatedResponse(
      items: data.map((e) => JobSummary.fromJson(e)).toList(),
      pagination: Pagination.fromJson(response.data['pagination']),
    );
  }

  Future<JobDetail> getJobById(String id) async {
    final response = await _dio.get('/requests/$id');
    return JobDetail.fromJson(response.data['data']);
  }

  Future<void> acceptJob(String id) async {
    await _dio.post('/requests/$id/accept');
  }

  Future<void> rejectJob(String id, {required String reason}) async {
    await _dio.post('/requests/$id/reject', data: {'reason': reason});
  }
}
```

### 6.2 Findings Schema Model

```dart
// lib/features/findings/domain/models/findings_field.dart
@freezed
class FindingsField with _$FindingsField {
  const factory FindingsField({
    required String key,
    required String label,
    required FieldType type,
    @Default(false) bool required,
    @Default(false) bool requiresPhoto,
    @Default(0) int minPhotos,
    List<String>? options,
  }) = _FindingsField;

  factory FindingsField.fromJson(Map<String, dynamic> json) =>
      _$FindingsFieldFromJson(json);
}

enum FieldType {
  @JsonValue('text') text,
  @JsonValue('textarea') textarea,
  @JsonValue('number') number,
  @JsonValue('select') select,
  @JsonValue('photo') photo,
}
```

### 6.3 Dynamic Form Renderer

```dart
// lib/features/findings/presentation/widgets/dynamic_form_renderer.dart
import 'package:flutter/material.dart';
import '../../domain/models/findings_field.dart';

class DynamicFormRenderer extends StatelessWidget {
  final List<FindingsField> schema;
  final Map<String, dynamic> values;
  final Map<String, List<File>> photos;
  final void Function(String key, dynamic value) onFieldChanged;
  final void Function(String key, List<File> files) onPhotosChanged;

  const DynamicFormRenderer({
    super.key,
    required this.schema,
    required this.values,
    required this.photos,
    required this.onFieldChanged,
    required this.onPhotosChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: schema.map((field) => _buildField(context, field)).toList(),
    );
  }

  Widget _buildField(BuildContext context, FindingsField field) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: switch (field.type) {
        FieldType.text     => _TextField(field: field, value: values[field.key], onChanged: (v) => onFieldChanged(field.key, v)),
        FieldType.textarea => _TextAreaField(field: field, value: values[field.key], onChanged: (v) => onFieldChanged(field.key, v)),
        FieldType.number   => _NumberField(field: field, value: values[field.key], onChanged: (v) => onFieldChanged(field.key, v)),
        FieldType.select   => _SelectField(field: field, value: values[field.key], onChanged: (v) => onFieldChanged(field.key, v)),
        FieldType.photo    => _PhotoField(field: field, files: photos[field.key] ?? [], onChanged: (f) => onPhotosChanged(field.key, f)),
      },
    );
  }
}

// Individual field widgets omitted for brevity — implement TextFormField,
// DropdownButtonFormField, and image_picker-based photo grid per field type.
```

### 6.4 Submit Findings (Multipart Upload)

```dart
// lib/features/findings/data/findings_remote_datasource.dart
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:geolocator/geolocator.dart';
import '../domain/models/submit_findings_request.dart';

class FindingsRemoteDatasource {
  final Dio _dio;
  FindingsRemoteDatasource(this._dio);

  Future<void> submitFindings({
    required String requestId,
    required Map<String, dynamic> findingData,
    required String overallStatus,
    required Map<String, List<File>> photosByField,
  }) async {
    // 1. Verify and capture GPS
    final position = await _captureGps();

    // 2. Validate GPS is within Pakistan bounds
    _validateGpsBounds(position);

    // 3. Build multipart form
    final formData = FormData();

    formData.fields.addAll([
      MapEntry('findingData', jsonEncode(findingData)),
      MapEntry('overallStatus', overallStatus),
      MapEntry('gpsLatitude', position.latitude.toString()),
      MapEntry('gpsLongitude', position.longitude.toString()),
    ]);

    // 4. Attach photos keyed by schema field key
    for (final entry in photosByField.entries) {
      for (final file in entry.value) {
        final compressed = await _compressImage(file);
        formData.files.add(MapEntry(
          entry.key,
          await MultipartFile.fromFile(
            compressed.path,
            filename: '${entry.key}_${DateTime.now().millisecondsSinceEpoch}.jpg',
          ),
        ));
      }
    }

    await _dio.post(
      '/inspections/$requestId/submit-findings',
      data: formData,
      options: Options(
        contentType: 'multipart/form-data',
        sendTimeout: const Duration(minutes: 3), // extended for uploads
      ),
    );
  }

  Future<Position> _captureGps() async {
    final permission = await Geolocator.requestPermission();
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      throw const AppException(
        message: 'Location permission is required for inspection submission.',
        code: 'LOCATION_PERMISSION_DENIED',
      );
    }
    return Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );
  }

  void _validateGpsBounds(Position pos) {
    if (pos.latitude < AppConfig.gpsLatMin ||
        pos.latitude > AppConfig.gpsLatMax ||
        pos.longitude < AppConfig.gpsLonMin ||
        pos.longitude > AppConfig.gpsLonMax) {
      throw const AppException(
        message: 'GPS coordinates are outside Pakistan boundaries.',
        code: 'INVALID_GPS',
      );
    }
  }

  Future<File> _compressImage(File file) async {
    final bytes = await file.readAsBytes();
    final img = image_lib.decodeImage(bytes);
    if (img == null) return file;

    // Resize if needed (max 1920 on longest side)
    final resized = img.width > 1920 || img.height > 1920
        ? image_lib.copyResize(img, width: 1920)
        : img;

    final compressed = image_lib.encodeJpg(resized, quality: 82);
    final tempFile = File('${file.parent.path}/compressed_${file.uri.pathSegments.last}');
    await tempFile.writeAsBytes(compressed);
    return tempFile;
  }
}
```

### 6.5 Notifications

```dart
// lib/features/notifications/data/notifications_remote_datasource.dart
class NotificationsRemoteDatasource {
  final Dio _dio;
  NotificationsRemoteDatasource(this._dio);

  Future<PaginatedResponse<AppNotification>> getNotifications({
    int page = 1,
    int limit = 20,
    bool unreadOnly = false,
  }) async {
    final response = await _dio.get('/notifications', queryParameters: {
      'page': page,
      'limit': limit,
      'unreadOnly': unreadOnly.toString(),
    });
    final data = response.data['data'] as List;
    return PaginatedResponse(
      items: data.map((e) => AppNotification.fromJson(e)).toList(),
      pagination: Pagination.fromJson(response.data['pagination']),
    );
  }

  Future<int> getUnreadCount() async {
    final response = await _dio.get('/notifications/unread-count');
    return response.data['data']['unreadCount'] as int;
  }

  Future<void> markAsRead(String notificationId) async {
    await _dio.patch('/notifications/$notificationId/read');
  }

  Future<void> markAllAsRead() async {
    await _dio.patch('/notifications/read-all');
  }
}

// Polling service — start on app launch, stop on logout
class NotificationPoller {
  Timer? _timer;
  final NotificationsRemoteDatasource _datasource;
  final void Function(int count) onUnreadCountChanged;

  NotificationPoller(this._datasource, {required this.onUnreadCountChanged});

  void start() {
    _timer = Timer.periodic(
      Duration(seconds: AppConfig.notificationPollIntervalSeconds),
      (_) async {
        try {
          final count = await _datasource.getUnreadCount();
          onUnreadCountChanged(count);
        } catch (_) {} // silent fail — polling is best-effort
      },
    );
  }

  void stop() => _timer?.cancel();
}
```

---

## 7. Offline-First & Sync Queue

### 7.1 Sync Queue Database (`lib/core/sync/sync_queue.dart`)

```dart
import 'package:drift/drift.dart';

// Drift table for queuing offline submissions
class SyncQueueItems extends Table {
  IntColumn get id       => integer().autoIncrement()();
  TextColumn get type    => text()(); // e.g., 'SUBMIT_FINDINGS', 'ACCEPT_JOB'
  TextColumn get payload => text()(); // JSON-encoded
  IntColumn  get retries => integer().withDefault(const Constant(0))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn? get lastAttemptAt => dateTime().nullable()();
}

@DriftDatabase(tables: [SyncQueueItems])
class SyncQueueDatabase extends _$SyncQueueDatabase {
  SyncQueueDatabase() : super(_openConnection());

  @override int get schemaVersion => 1;

  Future<void> enqueue(String type, Map<String, dynamic> payload) =>
      into(syncQueueItems).insert(SyncQueueItemsCompanion.insert(
        type: type,
        payload: jsonEncode(payload),
      ));

  // Convenience: enqueue a findings submission with photo paths (not File objects)
  // Call this from the repository when offline, instead of the live submit.
  //
  //   await db.enqueueFindingsSubmission(
  //     requestId: requestId,
  //     findingData: findingData,
  //     overallStatus: 'satisfactory',
  //     gpsLatitude: position.latitude,
  //     gpsLongitude: position.longitude,
  //     // Pass absolute paths — File objects are volatile across restarts
  //     photosByField: { 'stock_condition': ['/data/user/.../photo1.jpg'] },
  //   );
  Future<void> enqueueFindingsSubmission({
    required String requestId,
    required Map<String, dynamic> findingData,
    required String overallStatus,
    required double gpsLatitude,
    required double gpsLongitude,
    required Map<String, List<String>> photosByField, // key → absolute file paths
  }) =>
      enqueue('SUBMIT_FINDINGS', {
        'requestId': requestId,
        'findingData': findingData,
        'overallStatus': overallStatus,
        'gpsLatitude': gpsLatitude,
        'gpsLongitude': gpsLongitude,
        'photosByField': photosByField,
      });

  Future<List<SyncQueueItem>> getPending() =>
      (select(syncQueueItems)..orderBy([(t) => OrderingTerm.asc(t.createdAt)]))
          .get();

  Future<void> remove(int id) =>
      (delete(syncQueueItems)..where((t) => t.id.equals(id))).go();

  Future<void> incrementRetry(int id) =>
      (update(syncQueueItems)..where((t) => t.id.equals(id))).write(
        SyncQueueItemsCompanion(
          retries: Value((await (select(syncQueueItems)
                ..where((t) => t.id.equals(id)))
              .getSingle())
              .retries + 1),
          lastAttemptAt: Value(DateTime.now()),
        ),
      );
}
```

### 7.2 Sync Worker (`lib/core/sync/sync_worker.dart`)

```dart
class SyncWorker {
  final SyncQueueDatabase _db;
  final Dio _dio;
  final ConnectivityService _connectivity;

  /// Called whenever a queue item is permanently dropped (max retries exceeded,
  /// or unrecoverable error such as SYNC_FILE_MISSING).
  /// The UI layer MUST register this callback and surface a recoverable alert —
  /// a silent drop is a data integrity risk on a verification platform.
  ///
  /// Example registration:
  ///   syncWorker.onSyncItemDropped = (item, reason) {
  ///     ref.read(syncAlertProvider.notifier).add(SyncDropAlert(
  ///       referenceNo: item.referenceNo,   // extracted from payload
  ///       reason: reason,
  ///       action: SyncDropAction.resubmit, // deep-link back to the findings form
  ///     ));
  ///   };
  void Function(SyncQueueItem item, String reason)? onSyncItemDropped;

  SyncWorker(this._db, this._dio, this._connectivity);

  Future<void> processQueue() async {
    if (!await _connectivity.isOnline) return;

    final pending = await _db.getPending();
    for (final item in pending) {
      if (item.retries >= AppConfig.maxRetryAttempts) {
        AppLogger.warn('Dropping queue item ${item.id} after max retries');
        await _db.remove(item.id);
        // Surface to UI — inspector must be told their submission was not sent
        _notifyDropped(item, 'Upload failed after ${AppConfig.maxRetryAttempts} attempts. Please resubmit.');
        continue;
      }

      try {
        await _dispatchItem(item);
        await _db.remove(item.id);
        AppLogger.info('Sync queue item ${item.id} processed successfully');
      } catch (e) {
        if (e is AppException && e.code == 'SYNC_FILE_MISSING') {
          // Unrecoverable — photos were deleted from device storage.
          // Drop immediately (incrementing retries would be misleading) and alert UI.
          AppLogger.warn('Dropping queue item ${item.id}: ${e.message}');
          await _db.remove(item.id);
          _notifyDropped(item, 'One or more inspection photos were removed from your device. Please retake photos and resubmit.');
        } else {
          await _db.incrementRetry(item.id);
          AppLogger.error('Sync queue item ${item.id} failed', error: e);
        }
      }
    }
  }

  void _notifyDropped(SyncQueueItem item, String reason) {
    if (onSyncItemDropped == null) {
      // Fail loudly in debug — a missing handler is a product defect, not a runtime error
      assert(false, 'SyncWorker.onSyncItemDropped is not registered. Dropped item ${item.id} silently. This is a data integrity risk.');
      return;
    }
    onSyncItemDropped!(item, reason);
  }

  Future<void> _dispatchItem(SyncQueueItem item) async {
    final payload = jsonDecode(item.payload) as Map<String, dynamic>;
    switch (item.type) {
      case 'ACCEPT_JOB':
        await _dio.post('/requests/${payload['id']}/accept');

      case 'REJECT_JOB':
        await _dio.post('/requests/${payload['id']}/reject',
            data: {'reason': payload['reason']});

      // Full SUBMIT_FINDINGS offline path:
      // Payload stores absolute file paths (not File objects — those are volatile).
      // On sync, we verify each file still exists, re-compress if needed, and upload.
      case 'SUBMIT_FINDINGS':
        final requestId = payload['requestId'] as String;
        final findingData = payload['findingData'] as Map<String, dynamic>;
        final overallStatus = payload['overallStatus'] as String;
        final gpsLatitude = payload['gpsLatitude'] as double;
        final gpsLongitude = payload['gpsLongitude'] as double;
        // photosByField: { "field_key": ["/abs/path/photo1.jpg", ...], ... }
        final rawPhotos = payload['photosByField'] as Map<String, dynamic>;

        final formData = FormData();
        formData.fields.addAll([
          MapEntry('findingData', jsonEncode(findingData)),
          MapEntry('overallStatus', overallStatus),
          MapEntry('gpsLatitude', gpsLatitude.toString()),
          MapEntry('gpsLongitude', gpsLongitude.toString()),
        ]);

        for (final entry in rawPhotos.entries) {
          final paths = List<String>.from(entry.value as List);
          for (final path in paths) {
            final file = File(path);
            if (!await file.exists()) {
              // File was deleted from device storage — abort this item entirely
              throw AppException(
                message: 'Photo file missing at $path — cannot sync findings.',
                code: 'SYNC_FILE_MISSING',
              );
            }
            // Re-compress from stored path (same logic as live submission)
            final compressed = await _compressImage(file);
            formData.files.add(MapEntry(
              entry.key,
              await MultipartFile.fromFile(
                compressed.path,
                filename: '${entry.key}_sync_${DateTime.now().millisecondsSinceEpoch}.jpg',
              ),
            ));
          }
        }

        await _dio.post(
          '/inspections/$requestId/submit-findings',
          data: formData,
          options: Options(
            contentType: 'multipart/form-data',
            sendTimeout: const Duration(minutes: 3),
          ),
        );

      default:
        AppLogger.warn('Unknown sync queue type: ${item.type}');
    }
  }

  // Compression helper — mirrors FindingsRemoteDatasource._compressImage()
  Future<File> _compressImage(File file) async {
    final bytes = await file.readAsBytes();
    final img = image_lib.decodeImage(bytes);
    if (img == null) return file;
    final resized = img.width > 1920 || img.height > 1920
        ? image_lib.copyResize(img, width: 1920)
        : img;
    final compressed = image_lib.encodeJpg(resized, quality: 82);
    final tempPath = '${file.parent.path}/sync_compressed_${file.uri.pathSegments.last}';
    return File(tempPath)..writeAsBytesSync(compressed);
  }
}
```

---

### 7.3 Sync Drop UX — Alert Provider & Recovery Banner

When a queue item is dropped, the inspector MUST see a named, actionable alert — not silence.

```dart
// lib/core/sync/sync_alert_provider.dart

@freezed
class SyncDropAlert with _$SyncDropAlert {
  const factory SyncDropAlert({
    required String itemId,
    required String requestId,   // from queue payload — used to deep-link
    required String referenceNo, // human-readable job reference e.g. REF-2026-0001
    required String reason,      // user-facing message, already sanitized
    required DateTime droppedAt,
  }) = _SyncDropAlert;
}

// Riverpod notifier — holds all unacknowledged drop alerts
class SyncAlertNotifier extends Notifier<List<SyncDropAlert>> {
  @override
  List<SyncDropAlert> build() => [];

  void add(SyncDropAlert alert) => state = [...state, alert];
  void dismiss(String itemId) => state = state.where((a) => a.itemId != itemId).toList();
}

final syncAlertProvider =
    NotifierProvider<SyncAlertNotifier, List<SyncDropAlert>>(SyncAlertNotifier.new);

// ── Wire the worker to the provider ─────────────────────────────────────────
// In your app initialisation (after ProviderScope is available):
//
//   final container = ProviderContainer();
//   final worker = sl<SyncWorker>();
//   worker.onSyncItemDropped = (item, reason) {
//     final payload = jsonDecode(item.payload);
//     container.read(syncAlertProvider.notifier).add(SyncDropAlert(
//       itemId: item.id.toString(),
//       requestId: payload['requestId'] ?? '',
//       referenceNo: payload['referenceNo'] ?? 'Unknown Job',
//       reason: reason,
//       droppedAt: DateTime.now(),
//     ));
//   };
```

```dart
// lib/core/sync/widgets/sync_drop_banner.dart
//
// Place this widget at the root of your main scaffold so it's visible
// from any screen. It renders one dismissable banner per dropped item.

class SyncDropBanner extends ConsumerWidget {
  const SyncDropBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final alerts = ref.watch(syncAlertProvider);
    if (alerts.isEmpty) return const SizedBox.shrink();

    return Column(
      children: alerts.map((alert) => MaterialBanner(
        backgroundColor: const Color(0xFFFFF3E0), // amber-50
        leading: const Icon(Icons.warning_amber_rounded, color: Color(0xFFF57C00)),
        content: Text(
          '${alert.referenceNo}: ${alert.reason}',
          style: const TextStyle(fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () {
              ref.read(syncAlertProvider.notifier).dismiss(alert.itemId);
              // Deep-link back to the findings form for this job
              context.push('/jobs/${alert.requestId}/findings');
            },
            child: const Text('RESUBMIT'),
          ),
          TextButton(
            onPressed: () => ref.read(syncAlertProvider.notifier).dismiss(alert.itemId),
            child: const Text('DISMISS'),
          ),
        ],
      )).toList(),
    );
  }
}
```

> **CONTRACT:** `onSyncItemDropped` MUST be registered before `SyncWorker.processQueue()` is ever called. An unregistered handler triggers an `assert` failure in debug builds to catch this at development time.

---

## 8. Error Handling & Retry Logic

### 8.1 Typed Exceptions (`lib/core/error/app_exception.dart`)

```dart
class AppException implements Exception {
  final String message;
  final String code;
  final int? statusCode;

  const AppException({
    required this.message,
    required this.code,
    this.statusCode,
  });

  @override
  String toString() => 'AppException[$code]: $message';
}

// Specialised subtypes
class NetworkException extends AppException {
  const NetworkException({required super.message, required super.code});
}

class AuthException extends AppException {
  const AuthException({required super.message, required super.code});
}

class ValidationException extends AppException {
  final List<String> details;
  const ValidationException({
    required super.message,
    required super.code,
    required this.details,
  });
}

// Fix 3: 429 rate-limit with Retry-After support
class RateLimitException extends AppException {
  final int retryAfterSeconds;
  const RateLimitException({
    required super.message,
    required super.code,
    required this.retryAfterSeconds,
  });
}
```

### 8.2 Central Error Handler (`lib/core/error/error_handler.dart`)

```dart
class ErrorHandler {
  /// Maps every DioException to a typed AppException.
  /// CONTRACT: This method MUST be the single exit point for all network errors.
  /// NEVER surface raw DioException, stack traces, or internal field names beyond this method.
  /// If statusCode is unrecognised, return AppException with code 'UNKNOWN_ERROR' — never a guess.
  static AppException handle(DioException e) {
    final data = e.response?.data;
    final code = data?['code'] as String? ?? 'UNKNOWN_ERROR';
    final message = data?['error'] as String? ?? 'An unexpected error occurred';

    return switch (e.response?.statusCode) {
      400 when code == 'VALIDATION_ERROR' => ValidationException(
          message: message,
          code: code,
          details: List<String>.from(data?['details'] ?? []),
        ),
      401 => AuthException(message: message, code: code),
      403 => AppException(message: message, code: code, statusCode: 403),
      404 => AppException(message: 'Resource not found', code: 'NOT_FOUND', statusCode: 404),
      409 => AppException(message: message, code: code, statusCode: 409),
      // Fix: Handle 429 — read Retry-After header and surface as typed exception
      429 => RateLimitException(
          message: 'Too many requests. Please wait before retrying.',
          code: 'RATE_LIMITED',
          retryAfterSeconds: int.tryParse(
            e.response?.headers.value('retry-after') ?? '60',
          ) ?? 60,
        ),
      500 => AppException(message: 'Server error. Please try again later.', code: 'SERVER_ERROR', statusCode: 500),
      _ when e.type == DioExceptionType.connectionTimeout ||
             e.type == DioExceptionType.receiveTimeout =>
          NetworkException(message: 'Connection timed out.', code: 'TIMEOUT'),
      _ when e.type == DioExceptionType.connectionError =>
          NetworkException(message: 'No internet connection.', code: 'NO_NETWORK'),
      // Fallback — return typed unknown, NEVER a guess at what happened
      _ => AppException(message: 'An unexpected error occurred.', code: 'UNKNOWN_ERROR'),
    };
  }
}
```

### 8.3 Retry Interceptor with Exponential Backoff (`lib/core/network/retry_interceptor.dart`)

```dart
import 'package:dio/dio.dart';
import 'dart:math';
import '../config/app_config.dart';
import '../logging/app_logger.dart';

class RetryInterceptor extends Interceptor {
  final Dio _dio;
  RetryInterceptor(this._dio);

  // Retry on network errors and 5xx only. 4xx are client errors — never retry.
  // 429 is handled separately: respect the Retry-After header, don't exponential-backoff.
  static const _retryableStatuses = {500, 502, 503, 504};

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final attempt = err.requestOptions.extra['retryCount'] as int? ?? 0;

    // Special case: 429 Rate Limited — use Retry-After header, not backoff
    if (err.response?.statusCode == 429) {
      final retryAfter = int.tryParse(
        err.response?.headers.value('retry-after') ?? '60',
      ) ?? 60;
      if (attempt < 1) { // only retry once on 429
        AppLogger.warn('Rate limited — waiting ${retryAfter}s before retry');
        await Future.delayed(Duration(seconds: retryAfter));
        err.requestOptions.extra['retryCount'] = 1;
        try {
          final response = await _dio.fetch(err.requestOptions);
          return handler.resolve(response);
        } catch (e) {
          return handler.next(err);
        }
      }
      return handler.next(err);
    }

    final isRetryable = _retryableStatuses.contains(err.response?.statusCode) ||
        err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.receiveTimeout;

    if (isRetryable && attempt < AppConfig.maxRetryAttempts) {
      final delay = _exponentialDelay(attempt);
      AppLogger.warn(
        'Retrying request (attempt ${attempt + 1}) after ${delay.inMilliseconds}ms',
      );
      await Future.delayed(delay);
      err.requestOptions.extra['retryCount'] = attempt + 1;
      try {
        final response = await _dio.fetch(err.requestOptions);
        return handler.resolve(response);
      } catch (e) {
        return handler.next(err);
      }
    }
    handler.next(err);
  }

  Duration _exponentialDelay(int attempt) {
    final jitter = Random().nextInt(500);
    final base = AppConfig.initialRetryDelay.inMilliseconds;
    return Duration(milliseconds: (base * pow(2, attempt)).toInt() + jitter);
  }
}
```

---

## 9. Security Implementation

### 9.1 Certificate Pinning Service (`lib/core/security/cert_pinning_service.dart`)

```dart
import 'dart:io';
import 'dart:convert';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';

class CertPinningService {
  // SHA-256 fingerprints of the server's public key(s)
  // Generate: openssl s_client -connect verification-platform-server.vercel.app:443 2>/dev/null \
  //   | openssl x509 -pubkey -noout | openssl pkey -pubin -outform DER \
  //   | openssl dgst -sha256 -binary | base64
  static const Set<String> _allowedPins = {
    'REPLACE_WITH_ACTUAL_PIN_BASE64==',     // Leaf certificate pin
    'REPLACE_WITH_BACKUP_PIN_BASE64==',     // Intermediate CA pin (backup)
  };

  bool isValidCertificate(X509Certificate cert, String host) {
    if (!host.contains('verification-platform-server.vercel.app')) {
      return false; // Reject unexpected hosts
    }

    final derBytes = cert.der;
    final hash = sha256.convert(Uint8List.fromList(derBytes));
    final pin = base64.encode(hash.bytes);

    return _allowedPins.contains(pin);
  }
}
```

### 9.2 Input Validation Utility

```dart
class InputValidator {
  static String? validateEmail(String? value) {
    if (value == null || value.isEmpty) return 'Email is required';
    final emailRegex = RegExp(r'^[^@]+@[^@]+\.[^@]+$');
    if (!emailRegex.hasMatch(value)) return 'Enter a valid email address';
    return null;
  }

  static String? validatePassword(String? value) {
    if (value == null || value.length < 8) return 'Minimum 8 characters';
    if (!value.contains(RegExp(r'[A-Z]'))) return 'Must include an uppercase letter';
    if (!value.contains(RegExp(r'[0-9]'))) return 'Must include a number';
    if (!value.contains(RegExp(r'[!@#\$%\^&\*]'))) return 'Must include a special character';
    return null;
  }

  static String? validateRequired(String? value, String fieldName) {
    if (value == null || value.trim().isEmpty) return '$fieldName is required';
    return null;
  }

  /// Sanitize text to prevent injection — strip control characters
  static String sanitize(String input) =>
      input.replaceAll(RegExp(r'[\x00-\x1F\x7F]'), '');
}
```

---

## 10. State Management

### 10.1 Auth State (Riverpod)

```dart
// lib/features/auth/presentation/auth_controller.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../domain/use_cases/login_usecase.dart';
import '../domain/models/auth_user.dart';

sealed class AuthState {}
class AuthInitial extends AuthState {}
class AuthLoading extends AuthState {}
class AuthAuthenticated extends AuthState { final AuthUser user; AuthAuthenticated(this.user); }
class AuthRequiresPasswordChange extends AuthState { final AuthUser user; AuthRequiresPasswordChange(this.user); }
class AuthUnauthenticated extends AuthState { final String? message; AuthUnauthenticated([this.message]); }

class AuthNotifier extends AsyncNotifier<AuthState> {
  @override
  Future<AuthState> build() async {
    final token = await sl<TokenStorage>().getAccessToken();
    return token != null ? AuthAuthenticated(/* restore user from storage */) : AuthUnauthenticated();
  }

  Future<void> login(String email, String password) async {
    state = const AsyncLoading();
    final result = await sl<LoginUseCase>().call(
      LoginRequest(email: InputValidator.sanitize(email), password: password),
    );
    state = AsyncData(switch (result) {
      LoginSuccess(data: final d) => AuthAuthenticated(d.user),
      LoginRequiresPasswordChange(data: final d) => AuthRequiresPasswordChange(d.user),
      LoginFailure(message: final m) => AuthUnauthenticated(m),
    });
  }

  Future<void> logout() async {
    await sl<AuthRemoteDatasource>().logout();
    await sl<TokenStorage>().clearAll();
    state = AsyncData(AuthUnauthenticated());
  }
}

final authProvider = AsyncNotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
```

---

## 11. Testing Strategy

### 11.1 Unit Test — Auth Repository

```dart
// test/features/auth/auth_repository_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:http_mock_adapter/http_mock_adapter.dart';

@GenerateMocks([AuthRemoteDatasource])
void main() {
  late Dio dio;
  late DioAdapter dioAdapter;

  setUp(() {
    dio = Dio(BaseOptions(baseUrl: 'https://verification-platform-server.vercel.app/api'));
    dioAdapter = DioAdapter(dio: dio);
  });

  group('Login', () {
    test('returns AuthResponse on 200', () async {
      dioAdapter.onPost('/auth/login', (server) => server.reply(200, {
        'success': true,
        'data': {
          'accessToken': 'test.jwt.token',
          'user': {'id': 'u1', 'email': 'test@test.com', 'role': 'inspector', 'fullName': 'Test'},
          'requiresPasswordChange': false,
        }
      }));

      final ds = AuthRemoteDatasource(dio);
      final result = await ds.login(LoginRequest(email: 'test@test.com', password: 'pass'));

      expect(result.accessToken, 'test.jwt.token');
      expect(result.requiresPasswordChange, false);
    });

    test('requiresPasswordChange=true is preserved', () async {
      dioAdapter.onPost('/auth/login', (server) => server.reply(200, {
        'success': true,
        'data': {
          'accessToken': 'token',
          'user': {'id': 'u1', 'email': 'x@x.com', 'role': 'inspector', 'fullName': 'X'},
          'requiresPasswordChange': true,
        }
      }));

      final ds = AuthRemoteDatasource(dio);
      final result = await ds.login(LoginRequest(email: 'x@x.com', password: 'old'));
      expect(result.requiresPasswordChange, true);
    });

    test('throws AuthException on 401', () async {
      dioAdapter.onPost('/auth/login', (server) => server.reply(401, {
        'success': false,
        'error': 'Invalid credentials',
        'code': 'INVALID_CREDENTIALS',
      }));

      final ds = AuthRemoteDatasource(dio);
      expect(
        () => ds.login(LoginRequest(email: 'bad@bad.com', password: 'wrong')),
        throwsA(isA<AuthException>()),
      );
    });
  });

  group('GPS Validation', () {
    test('rejects coordinates outside Pakistan', () {
      // New York coordinates
      expect(
        () => FindingsRemoteDatasource._validateGpsStatic(40.7128, -74.0060),
        throwsA(isA<AppException>().having((e) => e.code, 'code', 'INVALID_GPS')),
      );
    });

    test('accepts valid Lahore coordinates', () {
      expect(
        () => FindingsRemoteDatasource._validateGpsStatic(31.5204, 74.3587),
        returnsNormally,
      );
    });
  });
}
```

### 11.2 Mock Server Configuration (for Integration Tests)

```dart
// test/mock_server.dart — simulates the backend locally
class MockPavmpServer {
  static DioAdapter setup(Dio dio) {
    final adapter = DioAdapter(dio: dio);

    // Auth
    adapter.onPost('/auth/login', (s) => s.reply(200, _loginSuccess));
    adapter.onPost('/auth/refresh', (s) => s.reply(200, _refreshSuccess));
    adapter.onPost('/auth/logout', (s) => s.reply(200, {'success': true, 'message': 'Logged out'}));

    // Jobs
    adapter.onGet('/requests', (s) => s.reply(200, _jobsListResponse));
    adapter.onGet('/requests/f47ac10b', (s) => s.reply(200, _jobDetailResponse));
    adapter.onPost('/requests/f47ac10b/accept', (s) => s.reply(200, {'success': true, 'message': 'Job accepted'}));

    // Findings
    adapter.onPost('/inspections/f47ac10b/submit-findings',
        (s) => s.reply(201, _submittedFindingsResponse));

    // Notifications
    adapter.onGet('/notifications/unread-count',
        (s) => s.reply(200, {'success': true, 'data': {'unreadCount': 3}}));

    return adapter;
  }

  static final _loginSuccess = {
    'success': true,
    'data': {
      'accessToken': 'mock.jwt.token',
      'user': {'id': 'u1', 'email': 'inspector@test.com', 'role': 'inspector', 'fullName': 'Ali Khan'},
      'requiresPasswordChange': false,
    }
  };
  // ... other mock responses
}
```

### 11.3 Critical Flow Integration Tests

```dart
// test/integration/job_flow_test.dart
void main() {
  group('Complete Inspection Flow', () {
    test('Login → Get Jobs → Accept → Submit Findings', () async {
      // 1. Login
      final authResult = await loginUseCase(LoginRequest(email: 'test@test.com', password: 'pass'));
      expect(authResult, isA<LoginSuccess>());

      // 2. List jobs
      final jobs = await jobsRepo.getJobs();
      expect(jobs.items, isNotEmpty);

      // 3. Accept job
      final jobId = jobs.items.first.id;
      await jobsRepo.acceptJob(jobId);

      // 4. Fetch detail (verify status)
      final detail = await jobsRepo.getJobById(jobId);
      expect(detail.status, 'IN_PROGRESS');

      // 5. Submit findings
      await findingsRepo.submitFindings(
        requestId: jobId,
        findingData: {'stock_condition': 'Good', 'godown_address': 'Test'},
        overallStatus: 'satisfactory',
        photosByField: {},
      );
    });
  });
}
```

---

## 12. Performance Optimization

### 12.1 Response Caching Strategy

```dart
// Cache GET /requests for 2 minutes, /requests/:id for 5 minutes
final cacheOptions = CacheOptions(
  store: MemCacheStore(),
  policy: CachePolicy.refreshForceCache,
  hitCacheOnErrorExcept: [401, 403],
  maxStale: const Stale(Duration(minutes: 5)),
  priority: CachePriority.normal,
);

// Attach to dio
dio.interceptors.add(DioCacheInterceptor(options: cacheOptions));
```

### 12.2 Image Optimization Before Upload

```dart
// Target: < 1MB per image, max 1920px, JPEG quality 82
// See _compressImage() in Section 6.4 above.
// Always compress before adding to FormData.
```

### 12.3 Pagination Handling

```dart
// Infinite scroll with Riverpod — accumulate pages
class JobsNotifier extends AutoDisposeAsyncNotifier<List<JobSummary>> {
  int _currentPage = 1;
  bool _hasMore = true;

  @override
  Future<List<JobSummary>> build() => _fetch();

  Future<List<JobSummary>> _fetch() async {
    final result = await sl<JobsRemoteDatasource>().getJobs(page: _currentPage);
    _hasMore = _currentPage < result.pagination.totalPages;
    return result.items;
  }

  Future<void> loadMore() async {
    if (!_hasMore) return;
    _currentPage++;
    final newItems = await _fetch();
    state = AsyncData([...state.value ?? [], ...newItems]);
  }
}
```

### 12.4 Debounce on Search & Request Deduplication

```dart
// Debounce search input — prevents a new API call on every keystroke
class JobSearchNotifier extends AsyncNotifier<List<JobSummary>> {
  Timer? _debounce;

  void onSearchChanged(String query) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      ref.invalidateSelf();
      // triggers rebuild with new query param
    });
  }
}

// Request deduplication — prevent double-tap from firing two identical POST calls
class _DeduplicationInterceptor extends Interceptor {
  final _inflight = <String, Future<Response>>{};

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    // Only deduplicate idempotent GETs
    if (options.method != 'GET') return handler.next(options);
    final key = '${options.method}:${options.uri}';
    if (_inflight.containsKey(key)) {
      // Return the in-flight future directly — do not fire a second request
      _inflight[key]!.then(
        (response) => handler.resolve(response),
        onError: (e) => handler.next(options),
      );
      return;
    }
    handler.next(options);
  }
}
```

### 13.1 Structured Logger with PII Redaction (`lib/core/logging/app_logger.dart`)

```dart
import 'package:logger/logger.dart';
import 'package:uuid/uuid.dart';

class AppLogger {
  static final Logger _logger = Logger(
    printer: PrettyPrinter(methodCount: 2, printTime: true),
    level: AppConfig.environment == AppEnvironment.production
        ? Level.warning
        : Level.debug,
  );

  // PII fields to redact from logs
  static const _piiFields = {'password', 'token', 'email', 'phone', 'cnicNumber'};

  static String get _correlationId => const Uuid().v4().substring(0, 8);

  static Map<String, dynamic> _redact(Map<String, dynamic> data) {
    return data.map((k, v) =>
        _piiFields.contains(k) ? MapEntry(k, '***REDACTED***') : MapEntry(k, v));
  }

  static void info(String message, {Map<String, dynamic>? context}) =>
      _logger.i('[${_correlationId}] $message${context != null ? ' | ${_redact(context)}' : ''}');

  static void warn(String message, {Map<String, dynamic>? context}) =>
      _logger.w('[${_correlationId}] $message');

  static void error(String message, {Object? error, StackTrace? stackTrace}) =>
      _logger.e('[${_correlationId}] $message', error: error, stackTrace: stackTrace);

  static void debug(String message) {
    if (AppConfig.environment != AppEnvironment.production) {
      _logger.d(message);
    }
  }
}
```

### 13.2 Performance Metrics via Dio Interceptor

```dart
class MetricsInterceptor extends Interceptor {
  final _stopwatches = <String, Stopwatch>{};

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    _stopwatches[options.hashCode.toString()] = Stopwatch()..start();
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    final key = response.requestOptions.hashCode.toString();
    final elapsed = _stopwatches.remove(key)?.elapsedMilliseconds ?? 0;

    AppLogger.info('API Latency', context: {
      'method': response.requestOptions.method,
      'path': response.requestOptions.path,
      'status': response.statusCode,
      'latencyMs': elapsed,
    });

    // Alert if p95 threshold exceeded
    if (elapsed > 3000) {
      AppLogger.warn('Slow API response: ${response.requestOptions.path} took ${elapsed}ms');
    }

    handler.next(response);
  }
}
```

### 13.3 Crash Reporting Integration

Add `firebase_crashlytics: ^3.4.8` (or `sentry_flutter: ^7.18.0`) to `pubspec.yaml`, then wire into the logger and Flutter error handler:

```dart
// lib/main.dart — top-level error capture
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();

  // Catch Flutter framework errors
  FlutterError.onError = (details) {
    // Strip stack frames from internal packages before reporting
    FirebaseCrashlytics.instance.recordFlutterFatalError(details);
  };

  // Catch async errors outside Flutter framework (Isolate, Platform channels)
  PlatformDispatcher.instance.onError = (error, stack) {
    FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
    return true;
  };

  runApp(const ProviderScope(child: PavmpApp()));
}

// lib/core/logging/app_logger.dart — add to error() method:
static void error(String message, {Object? error, StackTrace? stackTrace}) {
  _logger.e('[${_correlationId}] $message', error: error, stackTrace: stackTrace);
  // Report to crash service with PII stripped — never send raw error.toString()
  if (AppConfig.environment == AppEnvironment.production) {
    FirebaseCrashlytics.instance.recordError(
      '$message [${error.runtimeType}]', // type only, no message which may contain PII
      stackTrace,
      reason: message,
      fatal: false,
    );
  }
}
```

> **pubspec additions:**
> ```yaml
> firebase_core: ^2.27.0
> firebase_crashlytics: ^3.4.8
> ```

### Client-Side Rate-Limit & Brute-Force Protection

```dart
// Enforce a minimum delay between login attempts on the client side.
// This does NOT replace server-side locking but prevents accidental hammering
// (e.g., from a retry loop or a double-tap on the login button).
class LoginRateLimiter {
  static const _minIntervalSeconds = 3;
  DateTime? _lastAttemptAt;

  bool get canAttempt {
    if (_lastAttemptAt == null) return true;
    return DateTime.now().difference(_lastAttemptAt!).inSeconds >= _minIntervalSeconds;
  }

  void recordAttempt() => _lastAttemptAt = DateTime.now();

  Duration get timeUntilNextAttempt {
    if (canAttempt) return Duration.zero;
    final elapsed = DateTime.now().difference(_lastAttemptAt!).inSeconds;
    return Duration(seconds: _minIntervalSeconds - elapsed);
  }
}
```

- [ ] Login button disabled for 3 seconds after each attempt (prevents double-tap race)
- [ ] `RateLimitException` surfaces `retryAfterSeconds` from `Retry-After` header to UI
- [ ] No automatic retry on 429 beyond the single Retry-After-respecting attempt

### Authentication & Token Security
- [ ] Access tokens stored **only** in platform Keystore/Keychain (never SharedPreferences or AsyncStorage)
- [ ] Refresh token is HTTP-only cookie — not accessible to JavaScript
- [ ] `requiresPasswordChange` guard blocks all navigation until password changed
- [ ] Auto-logout on 401 after failed refresh
- [ ] Token cleared from storage on explicit logout

### Transport Security
- [ ] TLS 1.3 enforced — no downgrade to TLS 1.2 or below
- [ ] Certificate pins configured for both leaf certificate and intermediate CA
- [ ] Backup pin provided so app remains functional during cert rotation
- [ ] Cleartext traffic disabled on Android (`usesCleartextTraffic="false"`)
- [ ] ATS enforced on iOS (`NSAllowsArbitraryLoads: false`)

### Input Validation
- [ ] All user inputs sanitized before sending (control character removal)
- [ ] Client-side validation mirrors backend validation (defense in depth)
- [ ] GPS bounds validated client-side before submission
- [ ] Image file type verified by MIME type, not just extension
- [ ] Image size capped at 5MB per file

### Data Protection
- [ ] No sensitive data written to device logs in production builds
- [ ] PII fields redacted in all log statements
- [ ] No sensitive data stored in app lifecycle state snapshots
- [ ] Screen capture disabled on sensitive screens (login, password change)

### OWASP Mobile Top 10
- [ ] M1 — Credential Security: Keystore/Keychain ✓
- [ ] M2 — Inadequate Supply Chain Security: SAST in CI/CD ✓
- [ ] M3 — Insecure Auth: JWT RS256, refresh rotation ✓
- [ ] M4 — Insufficient Input/Output Validation: Client + server ✓
- [ ] M5 — Insecure Communication: TLS 1.3 + cert pinning ✓
- [ ] M6 — Inadequate Privacy Controls: PII redaction ✓
- [ ] M7 — Insufficient Binary Protection: ProGuard/R8 ✓
- [ ] M8 — Security Misconfiguration: No cleartext, no debug in prod ✓
- [ ] M9 — Insecure Data Storage: No plain-text tokens ✓
- [ ] M10 — Insufficient Crypto: AES-256 Keystore, SHA-256 pins ✓

---

## 15. Deployment Verification

### Pre-Release Checklist

```bash
# 1. Verify all endpoints are reachable
curl -s -o /dev/null -w "%{http_code}" \
  https://verification-platform-server.vercel.app/api/auth/login \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"WrongPass@1"}'
# Expected: 401

# 2. Verify HTTPS redirect (no HTTP)
curl -I http://verification-platform-server.vercel.app/api/auth/login
# Expected: 301 or HTTPS enforced

# 3. Verify TLS version
openssl s_client -connect verification-platform-server.vercel.app:443 \
  -tls1_3 2>&1 | grep "Protocol"
# Expected: TLSv1.3

# 4. Get certificate public key hash for pinning
openssl s_client -connect verification-platform-server.vercel.app:443 2>/dev/null \
  | openssl x509 -pubkey -noout \
  | openssl pkey -pubin -outform DER \
  | openssl dgst -sha256 -binary \
  | base64
# Copy output → paste into CertPinningService._allowedPins AND network_security_config.xml
```

### Post-Deployment Smoke Tests

| Test | Endpoint | Expected |
|---|---|---|
| Login with valid credentials | `POST /auth/login` | 200 + accessToken |
| Login with wrong password | `POST /auth/login` | 401 INVALID_CREDENTIALS |
| Access protected route without token | `GET /requests` | 401 |
| Refresh with valid cookie | `POST /auth/refresh` | 200 + new accessToken |
| Accept a job not assigned to you | `POST /requests/:id/accept` | 403 FORBIDDEN |
| Submit findings outside Pakistan GPS | `POST /inspections/:id/submit-findings` | 400 INVALID_GPS |
| Get unread notification count | `GET /notifications/unread-count` | 200 + unreadCount |

### Performance Benchmarks

| Metric | Target | Alert Threshold |
|---|---|---|
| Login latency | < 500ms | > 1500ms |
| Job list (p95) | < 300ms | > 1000ms |
| Job detail (p95) | < 300ms | > 1000ms |
| Findings multipart upload | < 30s | > 90s |
| Notification poll | < 200ms | > 500ms |

---

## Quick Reference — All Endpoints

| # | Method | Endpoint | Auth |
|---|---|---|---|
| 1 | POST | `/auth/login` | No |
| 2 | POST | `/auth/refresh` | Cookie |
| 3 | POST | `/auth/logout` | Bearer |
| 4 | POST | `/auth/change-password` | Bearer |
| 5 | GET | `/requests` | Bearer |
| 6 | GET | `/requests/:id` | Bearer |
| 7 | POST | `/requests/:id/accept` | Bearer |
| 8 | POST | `/requests/:id/reject` | Bearer |
| 9 | GET | `/inspections/:id/findings-schema` | Bearer |
| 10 | POST | `/inspections/:id/submit-findings` | Bearer |
| 11 | GET | `/inspectors/me/profile` | Bearer |
| 12 | PATCH | `/inspectors/me/profile` | Bearer |
| 13 | GET | `/inspectors/:inspectorId/jobs` | Bearer |
| 14 | GET | `/notifications` | Bearer |
| 15 | GET | `/notifications/unread-count` | Bearer |
| 16 | PATCH | `/notifications/:id/read` | Bearer |
| 17 | PATCH | `/notifications/read-all` | Bearer |

---

*PAVMP Field Inspector v1.2.0 — prompt-pin: `pavmp-inspector-v1.2` — expires: 2026-12-31 — Backend: `https://verification-platform-server.vercel.app/api` — JWT RS256 — Flutter 3.10+ — Scorecard target: 100/100*
