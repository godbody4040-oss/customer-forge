import { sendTemplateEmail } from '../src/lib/email-templates/send-email'
const to = process.argv[2]!
const r1 = await sendTemplateEmail('automation-message', to, {
  idempotencyKey: 'revora-e2e-automation-1',
  templateData: { businessName: 'Revora QA Detailing', heading: 'Thanks for reaching out, Jordan', message: "We got your request for a full interior detail.\n\nWe'll confirm your time shortly." },
})
console.log('automation-message:', JSON.stringify(r1))
const r2 = await sendTemplateEmail('lead-alert', to, {
  idempotencyKey: 'revora-e2e-lead-alert-1',
  templateData: { businessName: 'Revora QA Detailing', kind: 'New booking request', leadName: 'Jordan Ellis', leadEmail: 'jordan@example.com', leadPhone: '+19195550134', city: 'Raleigh', service: 'Full interior detail', estimate: '$240–$320', when: new Date().toLocaleString() },
})
console.log('lead-alert:', JSON.stringify(r2))
