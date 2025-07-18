import { Container, Paper, Typography } from "@mui/material";
import Signin from "./Singin";
import { getUser } from "src/server/LOGIN_LUCIA_ACTION/lucia";
import { redirect } from "next/navigation";

const Login = async () => {
  const user = await getUser();
  if (user) {
    return redirect("/podstran");
  }

  return (
    <Container
      maxWidth={false}
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.900',
        position: 'relative',
        overflow: 'hidden',
        px: { xs: 2, md: 4 }
      }}
    >
      <Typography
        variant="h1"
        sx={{
          position: 'absolute',
          top: { xs: 20, md: 32 },
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: { xs: '4rem', md: '8rem' },
          fontWeight: 'bold',
          color: 'common.white',
          opacity: 0.3,
          zIndex: 0
        }}
      >
        SENZEMO
      </Typography>

      <Paper
        elevation={8}
        sx={{
          width: { xs: '100%', sm: 400, md: 450 },
          p: { xs: 3, md: 4 },
          borderRadius: 3,
          bgcolor: 'grey.800',
          zIndex: 10
        }}
      >
        <Signin />
      </Paper>
    </Container>
  );
};

export default Login;
