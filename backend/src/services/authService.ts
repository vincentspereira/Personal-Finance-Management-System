import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { query } from '../db';
import { config } from '../config';

export async function register(email: string, password: string, name: string) {
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw Object.assign(new Error('Email already registered'), { statusCode: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await query(
    'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
    [email, passwordHash, name]
  );

  const user = result.rows[0];
  const token = generateToken(user);
  return { user: { id: user.id, email: user.email, name: user.name }, token };
}

export async function login(email: string, password: string) {
  const result = await query('SELECT id, email, name, password_hash FROM users WHERE email = $1', [email]);
  if (result.rows.length === 0) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  const token = generateToken(user);
  return { user: { id: user.id, email: user.email, name: user.name }, token };
}

export async function getUser(id: string) {
  const result = await query('SELECT id, email, name, created_at FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

function generateToken(user: { id: string; email: string }) {
  return jwt.sign(
    { id: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn } as SignOptions
  );
}
