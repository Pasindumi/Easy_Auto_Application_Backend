import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const protectAdmin = (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_change_this');

            if (!decoded.isAdmin) {
                return res.status(403).json({ message: 'Not authorized as admin' });
            }

            req.user = decoded; // { id, role, isAdmin }
            return next();
        } catch (error) {
            console.error('Admin Auth Error:', error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

export { protectAdmin };
