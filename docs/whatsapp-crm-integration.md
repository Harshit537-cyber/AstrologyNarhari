# WhatsApp CRM backend integration

All CRM API credentials are server-side environment variables. Do not send them to a browser or mobile client.

## CRM calls into this backend

Set the CRM-side API base URL to:

```env
BACKEND_API_URL=https://api.namahastro.com/api/crm
```

Set these backend environment variables in staging and production:

```env
BACKEND_API_HEADER=X-Backend-Api-Key
BACKEND_API_KEY=<long-random-secret>
BACKEND_WEBHOOK_SECRET=<separate-long-random-secret>
```

The backend API key protects the read endpoints and must be generated/configured by the deployment owner, then shared with the CRM team over a secure channel (not in this document). The webhook uses HMAC-SHA256 with the separate webhook secret.

### User lookup

```http
GET https://api.namahastro.com/api/crm/users/by-phone/919876543210
X-Backend-Api-Key: <BACKEND_API_KEY>
```

Returns `data.user` (`id`, `name`, `phone`, `plan`, `wallet`, `is_active`) and `data.last_booking`, or `404` when the phone is not registered. `plan` is currently `null` because the app has no user plan/membership field.

### Booking lookup

```http
GET https://api.namahastro.com/api/crm/bookings/682000000000000000000001
GET https://api.namahastro.com/api/crm/bookings?phone=919876543210
X-Backend-Api-Key: <BACKEND_API_KEY>
```

The first returns one booking; the second returns up to 50 bookings for that phone, newest first. Booking data includes `status`, `payment_status`, `date`, `time`, `astrologer`, `service`, and `amount`.

### CRM Payment Links

```http
POST https://api.namahastro.com/api/crm/payment-links
X-Backend-Api-Key: <BACKEND_API_KEY>
Content-Type: application/json

{
  "phone": "919876543210",
  "amount": 500
}
```

Returns `{ success: true, url: "https://rzp.io/i/xxxxxx", payment_link_id: "plink_xxxx", amount: 500 }`.
When paid by the user, the Razorpay webhook automatically credits the user's wallet balance and emits `wallet.recharged` to the CRM.

### Razorpay Webhook Configuration for Payment Links

In the Razorpay Dashboard (Settings -> Webhooks):
- **URL**: `https://api.namahastro.com/api/crm/webhooks/razorpay`
- **Active Events**: `payment_link.paid`
- **Secret**: Configure in backend as `RAZORPAY_WEBHOOK_SECRET`

### CRM webhook receiver

Configure the CRM with:

```text
BACKEND_WEBHOOK_URL=https://api.namahastro.com/api/crm/webhooks/events
BACKEND_WEBHOOK_SECRET=<same value as backend>
```

The receiver verifies `X-Namohastro-Timestamp` and `X-Namohastro-Signature` against the exact raw request body, rejects timestamps 5 minutes old or older, and stores event IDs to make retries idempotent. It acknowledges a first delivery with `202` and a duplicate with `200`. The backend currently records the event ID/type only; it does not yet update app leads, consent, or chat state from webhook payloads.

## Events sent by the app

Configure:

```env
CRM_EVENTS_URL=https://<crm-domain>/namohastro-crm/public/api/integration/events
BOOKING_EVENTS_API_KEY=<CRM-generated-api-key>
```

If `CRM_EVENTS_URL` is unset, the currently configured CRM URL is used. Booking confirmations and wallet recharges are sent asynchronously, so CRM latency does not delay the app response. The app sends `booking.confirmed` when a booking is accepted and `wallet.recharged` after a successful wallet payment.

## Current app limitations

The existing booking flow uses wallet balance and has no external payment-pending state, slot reservation expiry, or configured free-slot calendar. Razorpay is configured for app payment flows, but this integration does not create Razorpay payment links or bookings from WhatsApp. Those write APIs should not be enabled until the booking/payment workflow and the 10-minute slot-hold behavior are designed together.

The registered staging test phone is not yet available. Replace the test-phone placeholder in the handoff PDF with an approved test account before CRM testing.
