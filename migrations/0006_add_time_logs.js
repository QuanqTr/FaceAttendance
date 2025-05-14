export const up = async (client) => {
  // Create the time_log_type enum
  await client.query(`
    CREATE TYPE time_log_type AS ENUM ('checkin', 'checkout');
  `);

  // Create the time_logs table
  await client.query(`
    CREATE TABLE time_logs (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      log_time TIMESTAMP NOT NULL DEFAULT NOW(),
      type time_log_type NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // Create indexes for performance
  await client.query(`
    CREATE INDEX idx_time_logs_employee_id ON time_logs(employee_id);
    CREATE INDEX idx_time_logs_log_time ON time_logs(log_time);
    CREATE INDEX idx_time_logs_type ON time_logs(type);
  `);
};

export const down = async (client) => {
  // Drop the time_logs table
  await client.query(`
    DROP TABLE IF EXISTS time_logs;
  `);

  // Drop the time_log_type enum
  await client.query(`
    DROP TYPE IF EXISTS time_log_type;
  `);
}; 