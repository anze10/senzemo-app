import Signin from "./Singin";
import { getUser } from 'src/server/LOGIN_LUCIA_ACTION/lucia'
import { redirect } from 'next/navigation'

const Login = async () => {
  const user = await getUser()
  if (user) {
    return redirect('/podstran')
  }
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 text-center text-white text-opacity-30 text-8xl font-bold pt-8">
        SENZEMO
      </div>
      <div className="bg-gray-800 rounded-xl p-8 shadow-2xl z-10 w-96">
        <Signin />
      </div>
    </div>
  )
}

export default Login;
