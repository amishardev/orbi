import { GlassNavbar } from '@/components/landing/GlassNavbar';
import { HeroSection } from '@/components/landing/HeroSection';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] relative overflow-hidden font-sans selection:bg-pink-500/30">

      {/* Aurora Mesh Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-500/20 blur-[120px] rounded-full mix-blend-screen animate-pulse" />
        <div className="absolute top-[10%] right-[-10%] w-[40%] h-[60%] bg-purple-600/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <GlassNavbar />
      <HeroSection />
    </div>
  );
}
