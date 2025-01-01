"use client"
import {Button} from '@mui/material';
import { logOut } from 'src/server/auth.action';



export default function Buttonic() {
    const handleLogout = async () => {
        const result = await logOut(); // Call the server action
        if (result.success) {
            window.location.href = 'http://localhost:3000'; // Perform redirect
        } else {
            console.error("Logout failed");
        }
    };

    return <Button onClick={handleLogout}>Log Out</Button>;
}       
