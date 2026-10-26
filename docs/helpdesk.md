# Support helpdesk

Open the deployed [staff workspace](https://brightwater-app-production.up.railway.app/workspace) and select **Support**. This extends the existing system; the previous incident records remain in a collapsible history section.

## Staff workflow

1. Create a ticket with customer name/email, subject, description, priority and optional owner.
2. Assign an active staff member. Administrators and dispatchers manage all tickets. Engineers can read and update only their assigned tickets; viewers cannot change tickets.
3. Add an **internal note** for staff or a **public reply** for the customer portal. Internal is the default. Saving a public reply does not send email unless a manager explicitly selects **Send by email**.
4. Track Open, In progress, Waiting for customer, Resolved and Closed. Filter by status, overdue or free-text search.
5. Issue a private customer link when needed. Reissuing invalidates the previous link; revoke removes access immediately. Links expire after 30 days. Share privately: possession permits access to that ticket.
6. Review email delivery under the ticket. “Accepted by Gmail” is SMTP acceptance, not proof of inbox delivery or reading. Failed/uncertain sends require checking Gmail Sent before manually retrying to avoid duplicate messages.

The customer portal shows public messages only. It accepts replies, reopens resolved tickets and refuses replies to closed tickets. Tokens are stored as SHA-256 hashes, passed in an Authorization header, and carried in URL fragments rather than request URLs. The portal is excluded from indexing and uses a no-referrer policy. It is a bearer-link portal, not a separate customer account system.

## Gmail

The configured mailbox is held in Railway variables. Never put its app password in source, screenshots or documentation. Required variables on **brightwater-app** and **brightwater-worker**:

| Variable | Meaning |
|---|---|
| `SMTP_USER` | Gmail address |
| `SMTP_PASSWORD` | Gmail app password, server secret |
| `HELPDESK_IMAP_ENABLED` | `true` to enable isolated folder intake |
| `HELPDESK_IMAP_FOLDER` | `Brightwater Support` |

The integration uses Gmail SMTP over TLS on port 465 and IMAP over TLS on port 993. Authentication has been verified for both. No real customer test message was sent during this change.

**Receiving:** apply the Gmail label **Brightwater Support** to a support email and mark it unread, or create a Gmail filter that applies this label to the intended support mail. The worker reads only unread mail in this folder, not the personal inbox. Imported messages are marked read. Gmail filters are not created automatically. The folder was created during setup.

Each message becomes a new ticket. UID/UIDVALIDITY deduplication prevents replay of a previously imported message in the same folder. This first release does not thread email replies into old tickets; use the portal for a continuous thread. Moving/copying an email into a different mailbox epoch may produce a new ticket. Email addresses are sender assertions, not verified customer identities. No auto-reply is sent to inbound messages. HTML is converted to plain text; attachments are not imported. Messages over 2 MB are skipped and recorded in the import log. Ticket text is limited to 6,000 characters.

**Sending:** only explicitly selected ticket replies enter a PostgreSQL outbox. The existing enquiry acknowledgments, SMS and other customer-operation deliveries remain simulated. They are not activated by adding Gmail credentials. The worker claims queued messages and records attempts/outcomes; interrupted SMTP transactions are marked uncertain rather than automatically resent. Staff can retry after checking Sent mail.

## Service targets and Tasks

| Priority | First/next response | Resolution |
|---|---:|---:|
| Urgent | 1 hour | 4 hours |
| High | 4 hours | 24 hours |
| Normal | 24 hours | 72 hours |

Targets use elapsed wall-clock hours, not a business-hours calendar or contractual SLA. Waiting for customer does not pause the clock. A public staff response satisfies the response target; internal notes do not. A subsequent customer reply starts a fresh response cycle after a staff response. Repeated customer messages while already awaiting a reply do not push the deadline back. Reopening a resolved ticket resets its targets. Priority changes recalculate deadlines from the current cycle start and can immediately make a ticket overdue.

The existing scheduled worker creates at most one overdue response task and one overdue resolution task per ticket cycle. Tasks inherit ticket ownership; assignment and resolution update related tasks. The escalation is an internal task, not an SMS or engineer dispatch. The helpdesk tick continues independently of the separate enquiry automation toggle.

## Deployment and validation

Deploy the same application source to both the Railway web service and dedicated worker. The existing beat schedules worker ticks; no new database is needed. Ticket, message, outbox, import and worker-lease records use the existing PostgreSQL record store and backups. Local development uses SQLite. `npm ci`, `npm test`, `npm run build` remain the local checks. Dependencies added: Nodemailer, ImapFlow and Mailparser.

55 automated tests passed at this release, including six helpdesk tests covering engineer access, stale updates, private notes, expiring/revocable tokens, idempotent escalations, reopened tickets and explicit email selection. Production compilation passed. Browser workflow and deployment checks are recorded in the release handover. Authentication verification is not an end-to-end email delivery test.

## Limits

The helpdesk supports plain-text intake from a dedicated folder, elapsed-hour targets and bearer-link customer access, with up to 500 messages per ticket. Attachment handling, automatic email threading and business-hours calendars are future extensions. See the operational readiness guide for wider acceptance criteria.
