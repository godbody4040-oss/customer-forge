import { deliverEmail, deliverSms } from '../src/lib/messaging.server'
console.log('suppressed:', JSON.stringify(await deliverEmail({ id: 'qa-suppressed-1', action_type: 'email', recipient: 'qa.owner.9001@gmail.com', subject: 'QA', body: 'QA body' })))
console.log('no address:', JSON.stringify(await deliverEmail({ id: 'qa-none', action_type: 'email', recipient: '', subject: 'x', body: 'y' })))
console.log('sms:', JSON.stringify(await deliverSms({ id: 'qa-sms', action_type: 'sms', recipient: '+19195550134', subject: 'x', body: 'y' })))
console.log('sms bad number:', JSON.stringify(await deliverSms({ id: 'qa-sms2', action_type: 'sms', recipient: 'nope', subject: 'x', body: 'y' })))
