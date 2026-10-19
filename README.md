# Digital Municipality Services – Committee Engine UI

Angular 18 frontend for Committee Engine (Identity + Config + Committee + Workflow + Document + Audit).

## Design
- Matches existing Digital Bangladesh green theme
- Login page follows provided screenshot style
- Multi-step registration per Identity Service documentation

## Run

```bash
npm install
ng serve
```

Open http://localhost:4200

## API Configuration

Edit `src/environments/environment.ts`:

```ts
apiBaseUrl: 'http://localhost:8080/api/v1'
```

When backend is unavailable, services use **mock fallbacks** so UI remains fully navigable.

## Features Implemented (Sequence 1–5)

### 1. Identity / Auth
- Login (mobile/email + optional municipality)
- 5-step Registration (Policy → Municipality → Mobile check + OTP → OTP verify → Profile)
- Forgot Password
- JWT interceptor + Auth/Guest guards
- Session in localStorage

### 2. Committee
- List with status filter
- Create draft (type version → designations → members)
- Submit for approval
- Detail view with members

### 3. Workflow
- Pending approval list
- Decision screen: Approve / Reject / Delegate
- Step timeline

### 4. Config Admin
- Committee Types
- Designations (create)
- Approval Routes (visual steps)
- Scope Tree

### 5. Role-based menu
- Admin menu only for MUNICIPALITY_ADMIN / PLATFORM_ADMIN
- Workflow nav for APPROVER roles
- Language signal (formLanguage BN/EN) ready

## Project Structure

```
src/app/
  auth/           Login, Register, ForgotPassword
  core/
    models/       User, Committee, Workflow, Config
    services/     Auth, Committee, Workflow, Config
    guards/       authGuard, guestGuard
    interceptors/ authInterceptor
  features/
    dashboard/
    committee/
    workflow/
    document/
    config/
    audit/
  layout/         Main shell (header + nav)
```

## Next (Backend integration)
- Point environment URLs to real services
- Replace mock user search in member add with Identity user lookup API
- Wire Document upload to Document Service
- Add full i18n files (bn.json / en.json) driven by municipality.form_language
