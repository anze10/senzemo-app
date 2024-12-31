'use client'
import React from 'react'
import { Button } from '@mui/material'
import { logOut } from 'src/server/auth.action'

type Props = {
    children: React.ReactNode
}

const SignOutButton = ({ children }: Props) => {
    
    
    return (
        <div>
        <Button onClick={() => { logOut() }}>{children}</Button>

      </div>
    )
}
    

   

export default SignOutButton