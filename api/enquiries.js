const { MongoClient } = require('mongodb');

module.exports = async function handler(req, res) {
  const { password } = req.query;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const client = new MongoClient(process.env.MONGODB_URI);

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
    return res.status(500).json({ error: err.message });
  } finally {
    await client.close();
  }
};
