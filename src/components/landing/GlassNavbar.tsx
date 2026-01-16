'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function GlassNavbar() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/10 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 via-pink-500 to-orange-400 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(236,72,153,0.5)]">
                        <div className="w-full h-full bg-[url('/logo-splash.svg')] bg-no-repeat bg-center" />
                    </div>
                    <span className="text-xl font-bold text-white tracking-tight font-headline">Orbi</span>
                </Link>

                {/* Links */}
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
                    {['Explore', 'Community', 'Safety'].map((item) => (
                        <Link key={item} href="#" className="hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all">
                            {item}
                        </Link>
                    ))}
                </div>

                {/* CTA */}
                <div className="flex items-center gap-4">
                    <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                        Log In
                    </Link>
                    <Link href="/signup">
                        <Button className="rounded-full bg-transparent border border-white/20 hover:bg-white hover:text-black transition-all duration-300">
                            Join Now
                        </Button>
                    </Link>
                </div>
            </div>
        </nav>
    );
}
