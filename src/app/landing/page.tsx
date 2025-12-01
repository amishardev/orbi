import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Download, ChevronsRight, Atom } from 'lucide-react';
import Image from 'next/image';

function OrbiLogo({ className }: { className?: string }) {
  return (
    <Link href="/landing" className={`flex items-center gap-2 group ${className}`}>
      <Atom className="w-8 h-8 text-white group-hover:text-indigo-400 transition-colors" />
      <span className="text-xl font-bold text-white">
        Orbi
      </span>
    </Link>
  );
}

export default function LandingPage() {
  return (
    <div className="bg-[#404EED] min-h-screen text-white flex flex-col">
      <header className="py-5 px-6 md:px-12 flex justify-between items-center">
        <OrbiLogo />
        <nav className="hidden md:flex items-center gap-8">
          <Link href="#" className="hover:underline">Explore</Link>
          <Link href="#" className="hover:underline">Discover</Link>
          <Link href="#" className="hover:underline">Safety</Link>
          <Link href="#" className="hover:underline">Support</Link>
          <Link href="#" className="hover:underline">Blog</Link>
        </nav>
        <Button asChild className="bg-white text-black hover:bg-gray-200 hover:shadow-lg transition-all duration-200">
          <Link href="/login">Log In</Link>
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image src="https://picsum.photos/seed/1/1920/1080" alt="background" fill className="opacity-10 object-cover" />
        </div>

        <div className="z-10 max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-extrabold uppercase font-headline tracking-tighter">
            Group Chat That's All Fun & Games
          </h1>
          <p className="mt-6 text-lg md:text-xl max-w-2xl mx-auto text-gray-200">
            Orbi is the perfect place for us students to game, chill, and connect with friends—or even build a global community. You can customize your own space to chat, play, and hang out your way from IIM Sambalpur
          </p>
          <div className="mt-8 flex flex-col md:flex-row gap-6 items-center justify-center">
            <Button size="lg" variant="secondary" className="bg-gray-800 text-white hover:bg-gray-700 text-lg py-7 px-8 w-full md:w-auto">
              Open Orbi in your browser
              <ChevronsRight className="ml-2 h-6 w-6" />
            </Button>
          </div>
        </div>

        <div className="relative mt-12 w-full max-w-5xl h-64 md:h-[450px]">
          <Image src="https://picsum.photos/seed/2/1000/600" alt="App preview desktop" width={800} height={500} className="hidden md:block absolute bottom-0 left-1/2 transform -translate-x-1/2 z-10 rounded-t-lg" data-ai-hint="app interface" />
          <Image src="https://picsum.photos/seed/3/300/600" alt="App preview mobile" width={200} height={400} className="absolute bottom-0 left-1/2 transform -translate-x-[-60%] md:translate-x-[-120%] z-20 rounded-t-lg" data-ai-hint="mobile app" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#404EED] to-transparent"></div>
        </div>

      </main>
    </div>
  );
}
