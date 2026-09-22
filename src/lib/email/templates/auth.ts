/** Authentication + security templates (transactional, always delivered). */
import { APP_URL } from "../config";
import { greeting, greetingDe, row, strong, type TemplateDef } from "./types";

export const AUTH_TEMPLATES: TemplateDef[] = [
  {
    id: "auth-welcome",
    name: "Welcome / account created",
    description: "Sent right after signup, together with verification.",
    category: "authentication",
    kind: "transactional",
    sender: "hello",
    subject: {
      en: "Welcome to Verxa AI",
      de: "Willkommen bei Verxa AI",
      ar: "مرحبًا بك في Verxa AI",
    },
    preheader: {
      en: "Your account is ready — confirm your email to get started.",
      de: "Dein Konto ist bereit — bestätige deine E-Mail-Adresse.",
    },
    body: {
      en: (v) => [
        { type: "h", text: `Welcome, ${strong(v.name ?? "there")}` },
        {
          type: "p",
          text: `${greeting(v)} your Verxa account is ready. You now have curated AI models, live web search, and conversations synced across every device.`,
        },
        { type: "btn", label: "Start chatting", href: `${APP_URL}/chat` },
        {
          type: "p",
          text: "One more step: please confirm your email address — the verification email should already be in your inbox.",
        },
      ],
      de: (v) => [
        { type: "h", text: `Willkommen, ${strong(v.name ?? "there")}` },
        {
          type: "p",
          text: `${greetingDe(v)} dein Verxa-Konto ist bereit. Dich erwarten kuratierte KI-Modelle, Live-Websuche und synchronisierte Chats auf allen Geräten.`,
        },
        { type: "btn", label: "Chat starten", href: `${APP_URL}/chat` },
        {
          type: "p",
          text: "Noch ein Schritt: Bitte bestätige deine E-Mail-Adresse — die Verifizierungs-E-Mail sollte bereits in deinem Postfach sein.",
        },
      ],
    },
    vars: ["name", "email"],
  },
  {
    id: "auth-verify",
    name: "Email verification",
    description: "Verify-your-email link after registration.",
    category: "authentication",
    kind: "transactional",
    sender: "accounts",
    subject: {
      en: "Confirm your email address",
      de: "Bestätige deine E-Mail-Adresse",
      ar: "أكّد عنوان بريدك الإلكتروني",
    },
    preheader: {
      en: "One quick click to secure your Verxa account.",
      de: "Ein Klick sichert dein Verxa-Konto.",
    },
    body: {
      en: (v) => [
        { type: "h", text: "One quick click" },
        {
          type: "p",
          text: `${greeting(v)} please confirm your email address to secure your Verxa account.`,
        },
        { type: "btn", label: "Confirm email", href: String(v.verificationUrl ?? "#") },
        { type: "note", text: "This link expires in 24 hours and can only be used once." },
        { type: "p", text: "If you didn't create a Verxa account, you can ignore this email." },
      ],
      de: (v) => [
        { type: "h", text: "Ein schneller Klick" },
        {
          type: "p",
          text: `${greetingDe(v)} bitte bestätige deine E-Mail-Adresse, um dein Verxa-Konto zu sichern.`,
        },
        { type: "btn", label: "E-Mail bestätigen", href: String(v.verificationUrl ?? "#") },
        { type: "note", text: "Dieser Link läuft in 24 Stunden ab und kann nur einmal verwendet werden." },
        { type: "p", text: "Wenn du kein Verxa-Konto erstellt hast, ignoriere diese E-Mail einfach." },
      ],
      ar: (v) => [
        { type: "h", text: "نقرة واحدة سريعة" },
        {
          type: "p",
          text: `مرحبًا ${strong(v.name ?? "")}، يرجى تأكيد عنوان بريدك الإلكتروني لتأمين حساب Verxa الخاص بك.`,
        },
        { type: "btn", label: "تأكيد البريد", href: String(v.verificationUrl ?? "#") },
        { type: "note", text: "ينتهي هذا الرابط خلال 24 ساعة ولا يمكن استخدامه إلا مرة واحدة." },
      ],
    },
    vars: ["name", "email", "verificationUrl"],
  },
  {
    id: "auth-verify-reminder",
    name: "Email verification reminder",
    description: "Reminder for accounts that never verified.",
    category: "authentication",
    kind: "transactional",
    sender: "accounts",
    subject: {
      en: "Reminder: confirm your email address",
      de: "Erinnerung: Bestätige deine E-Mail-Adresse",
    },
    preheader: {
      en: "Your Verxa account is waiting for one click.",
      de: "Deinem Verxa-Konto fehlt nur noch ein Klick.",
    },
    body: {
      en: (v) => [
        { type: "h", text: "Still one step left" },
        {
          type: "p",
          text: `${greeting(v)} your email address is still unverified. Confirm it to unlock the full Verxa experience.`,
        },
        { type: "btn", label: "Confirm email", href: String(v.verificationUrl ?? "#") },
      ],
      de: (v) => [
        { type: "h", text: "Noch ein Schritt fehlt" },
        {
          type: "p",
          text: `${greetingDe(v)} deine E-Mail-Adresse ist noch unbestätigt. Bestätige sie, um Verxa vollständig zu nutzen.`,
        },
        { type: "btn", label: "E-Mail bestätigen", href: String(v.verificationUrl ?? "#") },
      ],
    },
    vars: ["name", "email", "verificationUrl"],
  },
  {
    id: "auth-password-reset-request",
    name: "Password reset request",
    description: "Reset link after a forgot-password request.",
    category: "authentication",
    kind: "transactional",
    sender: "security",
    subject: {
      en: "Reset your Verxa password",
      de: "Setze dein Verxa-Passwort zurück",
      ar: "أعد تعيين كلمة مرور Verxa",
    },
    preheader: {
      en: "We received a password reset request for your account.",
      de: "Wir haben eine Anfrage zum Zurücksetzen erhalten.",
    },
    body: {
      en: (v) => [
        { type: "h", text: "Password reset" },
        {
          type: "p",
          text: `${greeting(v)} we received a request to reset your Verxa password. Click below to choose a new one.`,
        },
        { type: "btn", label: "Reset password", href: String(v.resetPasswordUrl ?? "#") },
        { type: "note", text: "This link expires in 60 minutes and can only be used once." },
        { type: "p", text: "Didn't request this? Your account is safe — just ignore this email." },
      ],
      de: (v) => [
        { type: "h", text: "Passwort zurücksetzen" },
        {
          type: "p",
          text: `${greetingDe(v)} wir haben eine Anfrage erhalten, dein Verxa-Passwort zurückzusetzen. Wähle unten ein neues.`,
        },
        { type: "btn", label: "Passwort zurücksetzen", href: String(v.resetPasswordUrl ?? "#") },
        { type: "note", text: "Dieser Link läuft in 60 Minuten ab und kann nur einmal verwendet werden." },
        { type: "p", text: "Nicht angefordert? Dein Konto ist sicher — ignoriere diese E-Mail einfach." },
      ],
      ar: (v) => [
        { type: "h", text: "إعادة تعيين كلمة المرور" },
        {
          type: "p",
          text: `مرحبًا ${strong(v.name ?? "")}، تلقينا طلبًا لإعادة تعيين كلمة مرور Verxa الخاصة بك.`,
        },
        { type: "btn", label: "إعادة تعيين", href: String(v.resetPasswordUrl ?? "#") },
        { type: "note", text: "ينتهي هذا الرابط خلال 60 دقيقة ولا يمكن استخدامه إلا مرة واحدة." },
      ],
    },
    vars: ["name", "email", "resetPasswordUrl", "ipLocation", "device"],
  },
  {
    id: "auth-password-reset-link",
    name: "Password reset link (resent)",
    description: "Fresh link when the user asks for another reset email.",
    category: "authentication",
    kind: "transactional",
    sender: "security",
    subject: {
      en: "Here's your password reset link again",
      de: "Hier nochmal dein Link zum Zurücksetzen",
    },
    preheader: {
      en: "A fresh reset link, valid for 60 minutes.",
      de: "Ein neuer Link, 60 Minuten gültig.",
    },
    body: {
      en: (v) => [
        { type: "h", text: "Your new link" },
        {
          type: "p",
          text: `${greeting(v)} here's a fresh password reset link. Older links are now invalid.`,
        },
        { type: "btn", label: "Reset password", href: String(v.resetPasswordUrl ?? "#") },
        { type: "note", text: "This link expires in 60 minutes and can only be used once." },
      ],
      de: (v) => [
        { type: "h", text: "Dein neuer Link" },
        {
          type: "p",
          text: `${greetingDe(v)} hier ist ein neuer Link. Ältere Links sind jetzt ungültig.`,
        },
        { type: "btn", label: "Passwort zurücksetzen", href: String(v.resetPasswordUrl ?? "#") },
        { type: "note", text: "Dieser Link läuft in 60 Minuten ab und kann nur einmal verwendet werden." },
      ],
    },
    vars: ["name", "email", "resetPasswordUrl"],
  },
  {
    id: "auth-password-changed",
    name: "Password successfully changed",
    description: "Confirmation after a password change or reset.",
    category: "authentication",
    kind: "transactional",
    sender: "security",
    subject: {
      en: "Your Verxa password was changed",
      de: "Dein Verxa-Passwort wurde geändert",
      ar: "تم تغيير كلمة مرور Verxa",
    },
    preheader: {
      en: "Your password was just updated.",
      de: "Dein Passwort wurde gerade aktualisiert.",
    },
    body: {
      en: (v) => [
        { type: "h", text: "Security update" },
        { type: "p", text: `${greeting(v)} your Verxa password was just changed successfully.` },
        ...(v.timestamp || v.device
          ? [{ type: "meta" as const, rows: [row("When", v.timestamp), row("Device", v.device)] }]
          : []),
        { type: "note", text: "If this wasn't you, reset your password immediately and contact support." },
        { type: "btn", label: "Review security", href: `${APP_URL}/account/security` },
      ],
      de: (v) => [
        { type: "h", text: "Sicherheits-Update" },
        { type: "p", text: `${greetingDe(v)} dein Verxa-Passwort wurde erfolgreich geändert.` },
        ...(v.timestamp || v.device
          ? [{ type: "meta" as const, rows: [row("Wann", v.timestamp), row("Gerät", v.device)] }]
          : []),
        { type: "note", text: "Wenn du das nicht warst, setze dein Passwort sofort zurück und kontaktiere den Support." },
        { type: "btn", label: "Sicherheit prüfen", href: `${APP_URL}/account/security` },
      ],
    },
    vars: ["name", "email", "timestamp", "device"],
  },
  {
    id: "auth-password-reset-expired",
    name: "Password reset expired",
    description: "Sent when someone opens an expired/used reset link.",
    category: "authentication",
    kind: "transactional",
    sender: "security",
    subject: {
      en: "Your reset link has expired",
      de: "Dein Link ist abgelaufen",
    },
    preheader: {
      en: "Request a fresh link to reset your password.",
      de: "Fordere einen neuen Link an.",
    },
    body: {
      en: (v) => [
        { type: "h", text: "Link expired" },
        {
          type: "p",
          text: `${greeting(v)} the password reset link you opened has expired or was already used. Request a fresh one below.`,
        },
        { type: "btn", label: "Request new link", href: `${APP_URL}/forgot-password` },
      ],
      de: (v) => [
        { type: "h", text: "Link abgelaufen" },
        {
          type: "p",
          text: `${greetingDe(v)} der geöffnete Link ist abgelaufen oder wurde bereits verwendet. Fordere unten einen neuen an.`,
        },
        { type: "btn", label: "Neuen Link anfordern", href: `${APP_URL}/forgot-password` },
      ],
    },
    vars: ["name", "email"],
  },
  {
    id: "auth-password-reset-notice",
    name: "Password reset requested notification",
    description: "Extra notice when a reset is requested from an unrecognized device.",
    category: "security",
    kind: "transactional",
    sender: "security",
    subject: {
      en: "Password reset requested on your account",
      de: "Passwort-Zurücksetzung angefordert",
    },
    preheader: {
      en: "Requested from a device we haven't seen before.",
      de: "Von einem unbekannten Gerät angefordert.",
    },
    body: {
      en: (v) => [
        { type: "h", text: "Heads up" },
        {
          type: "p",
          text: `${greeting(v)} a password reset was requested from a device we haven't seen on your account before. If that was you, use the reset email we just sent.`,
        },
        { type: "meta", rows: [row("Device", v.device), row("Location", v.ipLocation), row("When", v.timestamp)] },
        { type: "note", text: "If this wasn't you, no action is needed — nothing changes without the reset link. Consider reviewing your security settings." },
      ],
      de: (v) => [
        { type: "h", text: "Zur Info" },
        {
          type: "p",
          text: `${greetingDe(v)} eine Zurücksetzung wurde von einem unbekannten Gerät angefordert. Wenn du das warst, nutze die Reset-E-Mail, die wir dir geschickt haben.`,
        },
        { type: "meta", rows: [row("Gerät", v.device), row("Standort", v.ipLocation), row("Wann", v.timestamp)] },
        { type: "note", text: "Wenn du das nicht warst, ist keine Aktion nötig — ohne den Link ändert sich nichts." },
      ],
    },
    vars: ["name", "email", "device", "ipLocation", "timestamp"],
  },
  {
    id: "auth-new-login",
    name: "New login detected",
    description: "New device or location sign-in.",
    category: "security",
    kind: "transactional",
    sender: "security",
    subject: {
      en: "New sign-in to your Verxa account",
      de: "Neue Anmeldung bei deinem Verxa-Konto",
      ar: "تسجيل دخول جديد إلى حساب Verxa",
    },
    preheader: {
      en: "We noticed a sign-in from a new device.",
      de: "Anmeldung von einem neuen Gerät erkannt.",
    },
    body: {
      en: (v) => [
        { type: "h", text: "New sign-in detected" },
        { type: "p", text: `${greeting(v)} your Verxa account was just accessed from a new sign-in.` },
        { type: "meta", rows: [row("Device", v.device), row("Location", v.ipLocation), row("When", v.timestamp)] },
        { type: "btn", label: "Review security", href: `${APP_URL}/account/security` },
        { type: "note", text: "If this wasn't you, reset your password right away." },
      ],
      de: (v) => [
        { type: "h", text: "Neue Anmeldung erkannt" },
        { type: "p", text: `${greetingDe(v)} dein Verxa-Konto wurde gerade neu angemeldet.` },
        { type: "meta", rows: [row("Gerät", v.device), row("Standort", v.ipLocation), row("Wann", v.timestamp)] },
        { type: "btn", label: "Sicherheit prüfen", href: `${APP_URL}/account/security` },
        { type: "note", text: "Wenn du das nicht warst, setze dein Passwort sofort zurück." },
      ],
      ar: (v) => [
        { type: "h", text: "تم رصد تسجيل دخول جديد" },
        { type: "p", text: `مرحبًا ${strong(v.name ?? "")}، تم الوصول إلى حساب Verxa الخاص بك للتو.` },
        { type: "meta", rows: [row("الجهاز", v.device), row("الموقع", v.ipLocation), row("الوقت", v.timestamp)] },
        { type: "btn", label: "مراجعة الأمان", href: `${APP_URL}/account/security` },
      ],
    },
    vars: ["name", "email", "device", "ipLocation", "timestamp"],
  },
  {
    id: "auth-login-activity",
    name: "Login activity notification",
    description: "Routine sign-in summary for a recognized device.",
    category: "security",
    kind: "transactional",
    sender: "security",
    subject: {
      en: "You signed in to Verxa",
      de: "Du hast dich bei Verxa angemeldet",
    },
    preheader: {
      en: "A quick record of your recent sign-in.",
      de: "Kurze Übersicht deiner Anmeldung.",
    },
    body: {
      en: (v) => [
        { type: "h", text: "Signed in" },
        { type: "p", text: `${greeting(v)} here's a record of your recent Verxa sign-in.` },
        { type: "meta", rows: [row("Device", v.device), row("When", v.timestamp)] },
        { type: "p", text: "Wasn't you? Reset your password and let us know." },
      ],
      de: (v) => [
        { type: "h", text: "Angemeldet" },
        { type: "p", text: `${greetingDe(v)} hier die Übersicht deiner letzten Anmeldung.` },
        { type: "meta", rows: [row("Gerät", v.device), row("Wann", v.timestamp)] },
        { type: "p", text: "Warst du das nicht? Setze dein Passwort zurück und melde dich." },
      ],
    },
    vars: ["name", "email", "device", "timestamp"],
  },
  {
    id: "auth-suspicious-login",
    name: "Suspicious login / security notification",
    description: "Impossible-travel or otherwise suspicious access.",
    category: "security",
    kind: "transactional",
    sender: "security",
    subject: {
      en: "⚠ Suspicious activity on your Verxa account",
      de: "⚠ Verdächtige Aktivität bei Verxa",
    },
    preheader: {
      en: "Please review this sign-in immediately.",
      de: "Bitte prüfe diese Anmeldung sofort.",
    },
    body: {
      en: (v) => [
        { type: "h", text: "Please review this" },
        {
          type: "p",
          text: `${greeting(v)} we blocked a suspicious sign-in attempt on your account. No access was granted, but stay alert.`,
        },
        { type: "meta", rows: [row("Device", v.device), row("Location", v.ipLocation), row("When", v.timestamp), row("Reason", v.note)] },
        { type: "btn", label: "Secure my account", href: `${APP_URL}/account/security` },
      ],
      de: (v) => [
        { type: "h", text: "Bitte prüfen" },
        {
          type: "p",
          text: `${greetingDe(v)} wir haben einen verdächtigen Anmeldeversuch blockiert. Es gab keinen Zugriff, bleib trotzdem wachsam.`,
        },
        { type: "meta", rows: [row("Gerät", v.device), row("Standort", v.ipLocation), row("Wann", v.timestamp), row("Grund", v.note)] },
        { type: "btn", label: "Konto sichern", href: `${APP_URL}/account/security` },
      ],
    },
    vars: ["name", "email", "device", "ipLocation", "timestamp", "note"],
  },
  {
    id: "auth-email-changed",
    name: "Email address changed",
    description: "Notice to the OLD address that it was replaced.",
    category: "security",
    kind: "transactional",
    sender: "security",
    subject: {
      en: "Your Verxa email address was changed",
      de: "Deine Verxa-E-Mail-Adresse wurde geändert",
    },
    preheader: {
      en: "Your account email was updated.",
      de: "Deine Konto-E-Mail wurde aktualisiert.",
    },
    body: {
      en: (v) => [
        { type: "h", text: "Email updated" },
        {
          type: "p",
          text: `${greeting(v)} the email address on your Verxa account was changed to ${strong(v.newEmail)}.`,
        },
        { type: "note", text: "If this wasn't you, reply immediately so we can lock the account." },
      ],
      de: (v) => [
        { type: "h", text: "E-Mail aktualisiert" },
        {
          type: "p",
          text: `${greetingDe(v)} die E-Mail-Adresse deines Kontos wurde zu ${strong(v.newEmail)} geändert.`,
        },
        { type: "note", text: "Wenn du das nicht warst, antworte sofort, damit wir das Konto sperren können." },
      ],
    },
    vars: ["name", "email", "newEmail"],
  },
  {
    id: "auth-email-change-confirm",
    name: "Email address change confirmation",
    description: "Confirm link sent to the NEW address.",
    category: "authentication",
    kind: "transactional",
    sender: "accounts",
    subject: {
      en: "Confirm your new email address",
      de: "Bestätige deine neue E-Mail-Adresse",
    },
    preheader: {
      en: "Click to finish changing your account email.",
      de: "Klicke, um die Änderung abzuschließen.",
    },
    body: {
      en: (v) => [
        { type: "h", text: "Almost done" },
        {
          type: "p",
          text: `${greeting(v)} click below to confirm ${strong(v.newEmail)} as your new Verxa email.`,
        },
        { type: "btn", label: "Confirm new email", href: String(v.verificationUrl ?? "#") },
        { type: "note", text: "This link expires in 24 hours and can only be used once." },
      ],
      de: (v) => [
        { type: "h", text: "Fast geschafft" },
        {
          type: "p",
          text: `${greetingDe(v)} klicke unten, um ${strong(v.newEmail)} als neue Adresse zu bestätigen.`,
        },
        { type: "btn", label: "Neue E-Mail bestätigen", href: String(v.verificationUrl ?? "#") },
        { type: "note", text: "Dieser Link läuft in 24 Stunden ab und kann nur einmal verwendet werden." },
      ],
    },
    vars: ["name", "email", "newEmail", "verificationUrl"],
  },
  {
    id: "auth-security-alert",
    name: "Account security alert",
    description: "Generic security alert with a custom message.",
    category: "security",
    kind: "transactional",
    sender: "security",
    subject: {
      en: "Security alert for your Verxa account",
      de: "Sicherheitswarnung für dein Konto",
    },
    preheader: {
      en: "Important information about your account security.",
      de: "Wichtige Info zu deiner Konto-Sicherheit.",
    },
    body: {
      en: (v) => [
        { type: "h", text: "Security alert" },
        { type: "p", text: greeting(v) },
        ...(v.message ? [{ type: "box" as const, text: String(v.message) }] : []),
        { type: "btn", label: "Review security", href: `${APP_URL}/account/security` },
      ],
      de: (v) => [
        { type: "h", text: "Sicherheitswarnung" },
        { type: "p", text: greetingDe(v) },
        ...(v.message ? [{ type: "box" as const, text: String(v.message) }] : []),
        { type: "btn", label: "Sicherheit prüfen", href: `${APP_URL}/account/security` },
      ],
    },
    vars: ["name", "email", "message"],
  },
  {
    id: "auth-account-recovery",
    name: "Account recovery",
    description: "Recovery instructions after a lockout or support request.",
    category: "authentication",
    kind: "transactional",
    sender: "accounts",
    subject: {
      en: "Recover your Verxa account",
      de: "Stelle dein Verxa-Konto wieder her",
    },
    preheader: {
      en: "Follow these steps to regain access.",
      de: "So erhältst du wieder Zugriff.",
    },
    body: {
      en: (v) => [
        { type: "h", text: "Account recovery" },
        {
          type: "p",
          text: `${greeting(v)} use the link below to recover access to your Verxa account.`,
        },
        { type: "btn", label: "Recover account", href: String(v.resetPasswordUrl ?? "#") },
        { type: "note", text: "This link expires in 60 minutes and can only be used once. If you didn't ask for recovery, ignore this email." },
      ],
      de: (v) => [
        { type: "h", text: "Konto-Wiederherstellung" },
        {
          type: "p",
          text: `${greetingDe(v)} nutze den Link unten, um wieder Zugriff zu erhalten.`,
        },
        { type: "btn", label: "Konto wiederherstellen", href: String(v.resetPasswordUrl ?? "#") },
        { type: "note", text: "Dieser Link läuft in 60 Minuten ab und kann nur einmal verwendet werden." },
      ],
    },
    vars: ["name", "email", "resetPasswordUrl"],
  },
  {
    id: "auth-account-deleted",
    name: "Account deletion confirmation",
    description: "Final confirmation that the account was deleted.",
    category: "authentication",
    kind: "transactional",
    sender: "accounts",
    subject: {
      en: "Your Verxa account has been deleted",
      de: "Dein Verxa-Konto wurde gelöscht",
    },
    preheader: {
      en: "Confirmation of your deletion request.",
      de: "Bestätigung deiner Löschanfrage.",
    },
    body: {
      en: () => [
        { type: "h", text: "Account deleted" },
        {
          type: "p",
          text: "Your Verxa account and associated data have been deleted as requested. We're sorry to see you go.",
        },
        { type: "p", text: "Changed your mind within the grace period? Reply to this email and we'll help." },
      ],
      de: () => [
        { type: "h", text: "Konto gelöscht" },
        {
          type: "p",
          text: "Dein Verxa-Konto und die zugehörigen Daten wurden wie gewünscht gelöscht. Schade, dass du gehst.",
        },
        { type: "p", text: "Noch innerhalb der Frist anders überlegt? Antworte einfach auf diese E-Mail." },
      ],
    },
    vars: ["email"],
  },
  {
    id: "auth-account-deletion-cancelled",
    name: "Account deletion cancelled",
    description: "Deletion request was cancelled, account stays active.",
    category: "authentication",
    kind: "transactional",
    sender: "accounts",
    subject: {
      en: "Account deletion cancelled — welcome back",
      de: "Löschung abgebrochen — willkommen zurück",
    },
    preheader: {
      en: "Your account stays active.",
      de: "Dein Konto bleibt aktiv.",
    },
    body: {
      en: (v) => [
        { type: "h", text: "You're staying 🎉" },
        {
          type: "p",
          text: `${greeting(v)} your deletion request was cancelled. Your account and data are untouched.`,
        },
        { type: "btn", label: "Open Verxa", href: `${APP_URL}/chat` },
      ],
      de: (v) => [
        { type: "h", text: "Du bleibst 🎉" },
        {
          type: "p",
          text: `${greetingDe(v)} deine Löschanfrage wurde abgebrochen. Konto und Daten sind unberührt.`,
        },
        { type: "btn", label: "Verxa öffnen", href: `${APP_URL}/chat` },
      ],
    },
    vars: ["name", "email"],
  },
];
