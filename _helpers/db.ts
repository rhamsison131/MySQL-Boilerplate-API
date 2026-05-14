import mysql from 'mysql2/promise';
import { Sequelize } from 'sequelize';
import accountModel from '../accounts/account.model';
import refreshTokenModel from '../accounts/refresh-token.model';

type FileConfig = {
  database?: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
  };
};

const fileConfig: FileConfig =
  process.env.NODE_ENV === 'production' ? {} : require('../config.json');


const db: any = {};
export default db;


async function initialize() {
  const databaseConfig = fileConfig.database; // Gets local database settings from config.json.

  const host = process.env.DB_HOST || databaseConfig.host; // Uses env DB host or local config host.
  const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : (databaseConfig.port || 3306); // Uses env DB port or default 3306.
  const user = process.env.DB_USER || databaseConfig.user; // Uses env DB user or local config user.
  const password = process.env.DB_PASSWORD || databaseConfig.password; // Uses env DB password or local config password.
  const database = process.env.DB_NAME || databaseConfig.database; // Uses env DB name or local config database.
  const ssl = process.env.DB_SSL === 'true'; // Enables SSL if DB_SSL is true.

  const connection = await mysql.createConnection({ host, port, user, password }); // Connects to MySQL server.

  if (process.env.NODE_ENV !== 'production' && host === 'localhost') {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`); // Creates DB only for local testing.
  }

  const sequelize = new Sequelize(database, user, password, {
    host,
    port,
    dialect: 'mysql',
    dialectOptions: ssl ? { ssl: { rejectUnauthorized: false } } : undefined // Adds SSL option if needed.
  });

  // Init models
  db.Account = accountModel(sequelize);
  db.RefreshToken = refreshTokenModel(sequelize);

  // Define relationships 
  db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
  db.RefreshToken.belongsTo(db.Account);

  // Sync models with database  
  await sequelize.sync();
}

initialize();