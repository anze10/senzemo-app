import { googleOAuthClient } from "src/server/googleOauth";
import { lucia } from "src/server/lucia";
import { prisma } from "src/server/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

// http://localhost:3000/api/auth/google/callback
export async function GET(req: NextRequest, res: Response) {
    const url = req.nextUrl
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')

    if (!code || !state) {
        console.error('no code or state')
        return new Response('Invalid Request', { status: 400 })
    }

    const codeVerifier = (await cookies()).get('codeVerifier')?.value
    const savedState = (await cookies()).get('state')?.value

    if (!codeVerifier || !savedState) {
        console.error('no code verifier or state')
        return new Response('Invalid Request', { status: 400 })
    }

    if (state !== savedState) {
        console.error('state mismatch')
        return new Response('Invalid Request', { status: 400 })
    }

    const { accessToken } = await googleOAuthClient.validateAuthorizationCode(code, codeVerifier)
    const googleResponse = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    })

    const googleData = (await googleResponse.json()) as {
        id: string,
        email: string,
        name: string,
        picture: string
    }

    let userId: string = ''
    // if the email exists in our record, we can create a cookie for them and sign them in
    // if the email doesn't exist, we create a new user, then craete cookie to sign them in

    const existingUser = await prisma.user.findUnique({
        where: {
            email: googleData.email
        }
    })
    if (existingUser) {
        userId = existingUser.id
    } else {
        const user = await prisma.user.create({
            data: {
                name: googleData.name,
                email: googleData.email,
                picture: googleData.picture
            }
        })
        userId = user.id
    }

    const session = await lucia.createSession(userId, {})
    const sessionCookie = await lucia.createSessionCookie(session.id)
        ; (await cookies()).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes)

    return redirect('/')
}