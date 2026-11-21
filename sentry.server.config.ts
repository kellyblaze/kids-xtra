import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  // Scrub child-related fields before sending to Sentry
  beforeSend(event) {
    if (event.extra) {
      delete event.extra["childId"]
      delete event.extra["childName"]
      delete event.extra["pin"]
    }
    return event
  },
})
