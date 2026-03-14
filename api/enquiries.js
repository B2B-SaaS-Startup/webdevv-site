import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);

export default async function handler(req, res) {
  const { password } = req.query;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await client.connect();
    const db = client.db('webdevv');
    const enquiries = await db.collection('enquiries')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json(enquiries);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    await client.close();
  }
}
