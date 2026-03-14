const { Resend } = require('resend');
const { MongoClient } = require('mongodb');

const resend = new Resend(process.env.RESEND_API_KEY);

const WEBDEVV_CONTEXT = `You are a helpful assistant for webdevv, a custom software development company. Here is everything you need to know:

SERVICES: Web app development, mobile apps (iOS & Android), cloud & DevOps, AI & data integration.

PRICING: Pricing depends entirely on the project scope. A simple website can start from as low as $100, while MVPs and full web/mobile apps typically range from $8,000–$20,000. Enterprise platforms and AI integrations are scoped individually. We always provide a transparent quote after a free discovery call — no surprises.

TIMELINE: A typical MVP takes 4–8 weeks. Larger projects take 3–6 months.

TECH STACK: React, Node.js, PostgreSQL, Supabase, Flutter, Python, AWS, GCP, and custom AI/LLM integrations.

CONTACT: support@webdevv.io — we respond within 24 hours.

PORTFOLIO: Pharmacy Pilot — a full-stack pharmacy management platform (React, Node.js, PostgreSQL, Supabase) at pharmacy-pilot.webdevv.io.

INSTRUCTIONS:
- Be friendly, concise, and professional.
- Always encourage visitors to fill out the contact form or email support@webdevv.io for a detailed quote.
- Never make up services, prices, or timelines beyond what is listed above.
- If asked something you don't know, say you'll have the team follow up via email.
- Keep replies short — 2–3 sentences max.`;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://webdevv.io');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Missing message' });

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    // Get AI reply from Groq
    const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}` 
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 200,
        messages: [
          { role: 'system', content: WEBDEVV_CONTEXT },
          { role: 'user', content: message }
        ]
      })
    });

    const aiData = await aiRes.json();
    console.log('Groq response:', JSON.stringify(aiData));
    const reply = aiData.choices?.[0]?.message?.content || 'Thanks for reaching out! Email us at support@webdevv.io and we will get back to you within 24 hours.';

    // Save to MongoDB
    await client.connect();
    const db = client.db('webdevv');
    await db.collection('enquiries').insertOne({
      type: 'chat',
      message,
      reply,
      createdAt: new Date()
    });

    // Email notification
    await resend.emails.send({
      from: 'webdevv <support@webdevv.io>',
      to: 'support@webdevv.io',
      subject: `New chat message — webdevv.io`,
      html: `
        <h2>New chat message from webdevv.io</h2>
        <p><strong>Visitor:</strong> ${message}</p>
        <p><strong>AI reply sent:</strong> ${reply}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      `
    });

    return res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  } finally {
    await client.close();
  }
};
