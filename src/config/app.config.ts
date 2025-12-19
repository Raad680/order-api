import * as dotenv from 'dotenv';

dotenv.config();
const  CONFIG = {

  app_port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',

  db_host: process.env.DB_HOST || 'localhost',
  db_port: parseInt(process.env.DB_PORT || '5432', 10),
  db_username: process.env.DB_USERNAME || 'postgres',
  db_password: process.env.DB_PASSWORD || 'abcd1234',
  db_name: process.env.DB_NAME || 'orders-api',

  redis_host: process.env.REDIS_HOST || 'localhost',
  redist_port: parseInt(process.env.REDIS_PORT || '6379', 10),
  ttl: parseInt(process.env.REDIS_TTL || '3600', 10),
}

export default CONFIG;