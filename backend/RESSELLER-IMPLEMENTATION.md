# BOXPANEL reseller scope

Approved reseller UI: **ADS** and **DNS** only.

- ADS: up to 8 JPG/PNG/WebP images per reseller, uploaded from mobile, stored in private Cloudflare R2 with server-generated object keys.
- DNS: up to 3 entries per reseller; create/edit/delete; HTTPS preferred. Existing HTTP provider URLs may be stored if specifically authorized, but never treat them as secure.
- All reseller panels retain BOXPANEL branding; the distributed app alone may have reseller-specific branding.
- Super admin sees and manages all resellers, DNS and adverts. Reseller sees only their own.
- The D1 triggers in reseller-limits.sql enforce counts regardless of browser UI.
- **Not deployed:** no Worker write access through current Cloudflare connector. No real upload endpoints, signed URLs or authenticated accounts yet.
- Before enabling uploads: verify Cloudflare Access JWT, resolve identity to reseller_id server-side, validate image content/type/size, use R2 key prefix based on verified reseller, prevent cross-tenant access, set content security headers, implement deletion cleanup and audit events.
