import z from "zod";

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  code: z.string().optional(), // Add the code property

  codeVerifier: z.string().optional(), // Add the codeVerifier property

});
