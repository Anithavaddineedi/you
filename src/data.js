import { supabase } from './supabaseClient.js'

export const relationMap = {
  Son: { en: 'Son', hi: 'बेटा', mr: 'मुलगा', ta: 'மகன்', es: 'Hijo' },
  Daughter: { en: 'Daughter', hi: 'बेटी', mr: 'मुलगी', ta: 'மகள்', es: 'Hija' },
  Wife: { en: 'Wife', hi: 'पत्नी', mr: 'पत्नी', ta: 'மனைவி', es: 'Esposa' },
  Doctor: { en: 'Doctor', hi: 'डॉक्टर', mr: 'डॉक्टर', ta: 'மருத்துவர்', es: 'Doctor' },
}

const familyContactsFallback = [
  { id: 1, name: 'Rahul Sharma', relationKey: 'Son', initials: 'RS', color: '#6fa8d6', online: true, phone: '+91 98765 43210' },
  { id: 2, name: 'Priya Sharma', relationKey: 'Daughter', initials: 'PS', color: '#7bc4a4', online: true, phone: '+91 98123 45678' },
  { id: 3, name: 'Anita Sharma', relationKey: 'Wife', initials: 'AS', color: '#e8b88f', online: false, phone: '+91 99000 11223' },
  { id: 4, name: 'Dr. Mehra', relationKey: 'Doctor', initials: 'DM', color: '#4a90a4', online: true, phone: '+91 90000 44556' },
]

const initialMessagesFallback = [
  { id: 1, sender: 'Rahul Sharma', initials: 'RS', color: '#6fa8d6', text: 'Hi Arjun, just checking in. Are you feeling okay today?', time: '2 min ago', unread: true },
  { id: 2, sender: 'Priya Sharma', initials: 'PS', color: '#7bc4a4', text: 'Sent you a photo of the kids! Look at how big they are getting.', time: '15 min ago', unread: true },
  { id: 3, sender: 'Rahul Sharma', initials: 'RS', color: '#6fa8d6', text: 'Remember to take your 2pm medicine, Arjun.', time: '1 hr ago', unread: false },
  { id: 4, sender: 'Dr. Mehra', initials: 'DM', color: '#4a90a4', text: 'Your test results look good. Keep up the daily walks!', time: '3 hr ago', unread: false },
]

const initialMedicinesFallback = [
  { id: 1, name: 'Blood Pressure', dose: '1 tablet', time: '8:00 AM', period: 'morning', taken: true },
  { id: 2, name: 'Vitamin D', dose: '1 capsule', time: '1:00 PM', period: 'afternoon', taken: false },
  { id: 3, name: 'Diabetes', dose: '1 tablet', time: '8:00 PM', period: 'evening', taken: false },
]

const initialNotificationsFallback = [
  { id: 1, icon: 'bi-chat-heart', color: '#6fa8d6', title: 'New Message', text: 'Rahul: Hi Arjun, just checking in...', time: '2 min ago' },
  { id: 2, icon: 'bi-capsule', color: '#e8b88f', title: 'Medicine Reminder', text: 'Time to take Vitamin D (1:00 PM)', time: '5 min ago' },
  { id: 3, icon: 'bi-heart-pulse', color: '#7bc4a4', title: 'Check-in Sent', text: 'Family was notified you are OK', time: '1 hr ago' },
  { id: 4, icon: 'bi-bell', color: '#4a90a4', title: 'Appointment', text: 'Dr. Mehra tomorrow at 10:30 AM', time: '2 hr ago' },
]

const dashboardMembersFallback = [
  { name: 'Rahul', initials: 'RS', color: '#6fa8d6', detail: 'Last check-in: 2 hr ago', status: 'ok' },
  { name: 'Priya', initials: 'PS', color: '#7bc4a4', detail: 'Last check-in: 5 hr ago', status: 'ok' },
  { name: 'Anita', initials: 'AS', color: '#e8b88f', detail: 'Last check-in: 1 day ago', status: 'warn' },
]

export async function loadData() {
  const [
    { data: familyContacts, error: e1 },
    { data: messages, error: e2 },
    { data: medicines, error: e3 },
    { data: notifications, error: e4 },
    { data: dashboardMembers, error: e5 },
  ] = await Promise.all([
    supabase.from('family_contacts').select('*').order('id', { ascending: true }),
    supabase.from('messages').select('*').order('id', { ascending: true }),
    supabase.from('medicines').select('*').order('id', { ascending: true }),
    supabase.from('notifications').select('*').order('id', { ascending: true }),
    supabase.from('dashboard_members').select('*').order('id', { ascending: true }),
  ])

  return {
    familyContacts: (!e1 && familyContacts?.length) ? familyContacts.map(c => ({
      id: c.id, name: c.name, relationKey: c.relation_key, initials: c.initials,
      color: c.color, online: c.online, phone: c.phone,
    })) : familyContactsFallback,
    initialMessages: (!e2 && messages?.length) ? messages.map(m => ({
      id: m.id, sender: m.sender, initials: m.initials, color: m.color,
      text: m.text, time: m.time, unread: m.unread,
    })) : initialMessagesFallback,
    initialMedicines: (!e3 && medicines?.length) ? medicines.map(m => ({
      id: m.id, name: m.name, dose: m.dose, time: m.time, period: m.period, taken: m.taken,
    })) : initialMedicinesFallback,
    initialNotifications: (!e4 && notifications?.length) ? notifications.map(n => ({
      id: n.id, icon: n.icon, color: n.color, title: n.title, text: n.text, time: n.time,
    })) : initialNotificationsFallback,
    dashboardMembers: (!e5 && dashboardMembers?.length) ? dashboardMembers.map(m => ({
      name: m.name, initials: m.initials, color: m.color, detail: m.detail, status: m.status,
    })) : dashboardMembersFallback,
  }
}

export async function updateMedicineTaken(id, taken) {
  return supabase.from('medicines').update({ taken }).eq('id', id)
}

export async function markMessageRead(id) {
  return supabase.from('messages').update({ unread: false }).eq('id', id)
}

export async function loadReplies(messageId) {
  const { data, error } = await supabase
    .from('message_replies')
    .select('*')
    .eq('message_id', messageId)
    .order('id', { ascending: true })
  if (error || !data) return []
  return data.map(r => ({ id: r.id, sender: r.sender, text: r.text }))
}

export async function sendReply(messageId, text) {
  const { data, error } = await supabase
    .from('message_replies')
    .insert({ message_id: messageId, sender: 'Arjun', text })
    .select('*')
    .single()
  if (error || !data) return null
  return { id: data.id, sender: data.sender, text: data.text }
}
