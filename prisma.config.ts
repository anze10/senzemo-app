import { defineConfig } from "prisma/config";
//import "dotenv/config"; // To load variables from your .env file

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL, // Your connection string
  },
});
