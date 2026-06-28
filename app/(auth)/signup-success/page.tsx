export default function SignUpSuccess() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 text-center">
      <div className="max-w-md w-full p-8 border border-gray-800 bg-[#121212] rounded-3xl">
        <h1 className="text-2xl font-black text-white mb-4">Check your email</h1>
        <p className="text-gray-400 text-sm mb-8">
          We have sent a confirmation link to your email address. Please click the link to verify your account and start managing your wealth.
        </p>
        <a 
          href="/login" 
          className="text-orange-500 font-bold hover:underline"
        >
          Back to login
        </a>
      </div>
    </div>
  );
}