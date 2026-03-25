const { Resend } = require('resend');
const { MongoClient } = require('mongodb');

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://webdevv.io';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, company, service, message } = req.body;

  // Validate
  if (!name || !email || !service || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (typeof name !== 'string' || name.trim().length > 100) {
    return res.status(400).json({ error: 'Invalid name' });
  }
  if (!EMAIL_REGEX.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (typeof message !== 'string' || message.trim().length > 2000) {
    return res.status(400).json({ error: 'Message too long (max 2000 chars)' });
  }

  const safe = {
    name: name.trim().slice(0, 100),
    email: email.trim().slice(0, 254),
    company: (company || '').trim().slice(0, 200),
    service: service.trim().slice(0, 100),
    message: message.trim().slice(0, 2000),
  };

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('webdevv');
    await db.collection('enquiries').insertOne({
      type: 'contact',
      ...safe,
      createdAt: new Date()
    });

    await resend.emails.send({
      from: 'webdevv <support@webdevv.io>',
      to: 'support@webdevv.io',
      subject: `New enquiry: ${escapeHtml(safe.service)} — ${escapeHtml(safe.name)}`,
      html: `
        <h2>New enquiry from webdevv.io</h2>
        <p><strong>Name:</strong> ${escapeHtml(safe.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(safe.email)}</p>
        <p><strong>Company:</strong> ${escapeHtml(safe.company) || 'N/A'}</p>
        <p><strong>Service:</strong> ${escapeHtml(safe.service)}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(safe.message)}</p>
      `
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  } finally {
    await client.close();
  }
};
