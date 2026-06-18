const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

const login = async (req, res) => {
    const { username, password } = req.body;

    try {
        const admin = await prisma.admin.findUnique({
            where: { username },
        });

        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: admin.id }, process.env.JWT_SECRET, {
            expiresIn: '24h',
        });

        res.json({ token, username: admin.username });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = { login };
