import app from './app.js';
import dotenv from 'dotenv';
import prisma from './core/config/db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

async function trackServer() {
  try {
    // Quick DB check
    await prisma.$connect();
    console.log('Database connected successfully.');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to the database', error);
    process.exit(1);
  }
}

trackServer();
