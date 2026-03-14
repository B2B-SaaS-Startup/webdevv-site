import { Resend } from 'resend';
import { MongoClient } from 'mongodb';

const resend = new Resend(process.env.RESEND_API_KEY);
const client = new MongoClient(process.env.MONGODB_URI);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://webdevv.io');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Missing message' });

  try {
    await client.connect();
    const db = client.db('webdevv');
    await db.collection('enquiries').insertOne({
      type: 'chat',
      message,
      createdAt: new Date()
    });

    await resend.emails.send({
      from: 'webdevv <support@webdevv.io>',
      to: 'support@webdevv.io',
      subject: `New chat message — webdevv.io`,
      html: `
        <h2>New chat message from webdevv.io</h2>
        <p><strong>Message:</strong> ${message}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
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
