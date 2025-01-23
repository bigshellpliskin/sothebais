import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen">
      <div className="flex-1 flex items-center justify-center">
        <SignIn 
          appearance={{
            elements: {
              rootBox: "w-full max-w-md",
              card: "shadow-lg"
            }
          }}
        />
      </div>
      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center">
        <h1 className="text-4xl font-bold text-white">SothebAI Admin</h1>
      </div>
    </div>
  );
} 