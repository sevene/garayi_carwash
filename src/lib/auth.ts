import { SignJWT, jwtVerify } from 'jose';

const secret = (typeof process !== 'undefined' && process.env && process.env.JWT_SECRET) || 'dev-secret-key-change-in-prod';
const JWT_SECRET = new TextEncoder().encode(secret);

export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

export async function createSession(payload: { userId: number; username: string; role: string }) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1d')
        .sign(JWT_SECRET);
}

export async function verifySession(token: string) {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload;
    } catch (error) {
        console.error('Session verification failed:', error);
        return null;
    }
}
