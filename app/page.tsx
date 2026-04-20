import { auth } from "@clerk/nextjs/server";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { RoleRedirect } from "@/components/role-redirect";
import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const { userId } = await auth();

  if (userId) {
    return <RoleRedirect />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#154c79] text-white p-4">
      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="flex justify-center mb-10 transition-transform hover:scale-105 duration-500">
          <div className="bg-white rounded-full p-1 bg-opacity-5 backdrop-blur-sm">
            <img 
              src="/logo.png" 
              alt="Nexus Logo" 
              className="w-40 h-40 object-contain mix-blend-multiply" 
            />
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="text-5xl font-black tracking-tight italic uppercase">Nexus</h1>
          <p className="text-xl text-indigo-100 italic">
            Empowering NGOs. Real-time coordination, real-time impact.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <SignInButton mode="modal">
            <Button size="lg" className="bg-card text-indigo-600 hover:bg-indigo-50 font-bold px-8">
              Login
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-card/10 font-bold px-8">
              Sign Up
            </Button>
          </SignUpButton>
        </div>
        <div className="pt-12 text-indigo-200 text-sm">
          Trusted by humanitarian organizations worldwide.
        </div>
      </div>
    </div>
  );
}

