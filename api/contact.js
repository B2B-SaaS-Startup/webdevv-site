const { Resend } = require('resend');
const { MongoClient } = require('mongodb');

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://webdevv.io');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, company, service, message } = req.body;

  if (!name || !email || !service || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('webdevv');
    await db.collection('enquiries').insertOne({
      type: 'contact',
      name, email, company, service, message,
      createdAt: new Date()
    });

    await resend.emails.send({
      from: 'webdevv <support@webdevv.io>',
      to: 'support@webdevv.io',
      subject: `New enquiry: ${service} — ${name}`,
      html: `
        <h2>New enquiry from webdevv.io</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Company:</strong> ${company || 'N/A'}</p>
        <p><strong>Service:</strong> ${service}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    await client.close();
  }
}
