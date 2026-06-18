async function createNotification(
  db,
  userId,
  type,
  title,
  body,
  referenceId,
  referenceType
) {
  const sql = `
    INSERT INTO notifications (user_id, type, title, body, reference_id, reference_type)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `;
  const params = [
    userId,
    type,
    title,
    body || null,
    referenceId || null,
    referenceType || null,
  ];
  const { rows } = await db.query(sql, params);
  return rows[0];
}

module.exports = { createNotification };

