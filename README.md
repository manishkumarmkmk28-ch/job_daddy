# JobDaddy – AI Resume Detector

Built with TanStack Start, React 19, TypeScript and Tailwind CSS v4.

## Run locally

```sh
# with Bun (a bun.lock is included)
bun install && bun run dev

# or with npm
npm install && npm run dev
```

Then open the URL printed in the terminal (usually http://localhost:8080 or :5173).

```sh
npm run build   # production build
npm test        # routing test
npm run format  # prettier (run this once before `npm run lint`)
```

## Configuration

Copy `.env.example` to `.env` and set:

| Variable | Purpose |
| --- | --- |
| `VITE_LEAD_WEBHOOK_URL` | Make.com / Google Apps Script URL that receives `{name, phone, email, timestamp}` for every verified lead. If empty, leads are only logged to the browser console. |

## Notes

- The OTP step is a **demo** (code `1234`, shown on screen). Replace `LeadGate.tsx`'s `MOCK_OTP`
  check with a real SMS/email OTP provider before relying on it to verify phone numbers.
- Resume analysis runs entirely in the browser (PDF via `pdfjs-dist`, DOCX via `mammoth`).
  Scanned/image-only PDFs contain no text and show a clear error instead of a report.
