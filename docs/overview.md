# Rental Management System Documentation

## Features
- Tenant dashboard: payment history, repair tickets, vacate notice
- Landlord dashboard: manage estates/apartments, rent payments, notices, repair tickets
- Notice board for communication

## API Endpoints (to be defined)
- /api/auth
- /api/tenants
- /api/landlords
- /api/payments
- /api/tickets
- /api/notices

### Tenant Code API

- POST /api/landlords/tenants/generate-code
	- Auth: Bearer token (landlord)
	- Body: { apartmentId }
	- Response: { tenantCode: string }
	- Notes: Generates a short tenant code with a 2–3 letter prefix derived from the apartment number/name and a 3-digit sequence (e.g., GP001). The server-side implementation uses a transaction and sequence resolution; concurrency tests run in CI against MySQL to validate uniqueness.

### M-Pesa (STK Push)

- POST /api/payments/mpesa/initiate
	- Auth: Bearer token (tenant OR landlord/caretaker depending on route)
	- Body: { apartmentId, amount, phone }
	- Response: { paymentId, checkoutRequestId?, merchantRequestId?, message }
	- Notes: The backend will use Safaricom Daraja when credentials are configured; in test/dev without credentials the flow returns a mock paymentId so clients can continue the UX. The frontend exposes an accessible modal for initiating STK pushes; it uses ARIA live regions and focus trapping for keyboard users.

## Data Models (to be defined)
- Tenant
- Landlord
- Estate/Apartment
- Payment
- Ticket
- Notice

---
Expand as features are implemented.