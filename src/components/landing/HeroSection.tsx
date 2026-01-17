'use client';

import { Button } from '@/components/ui/button';
import { OrbitSystem } from './OrbitSystem';

export function HeroSection() {
    return (
        <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center w-full">

                {/* Left: Typography */}
                <div className="space-y-8 text-center lg:text-left z-10">
                    <h1 className="text-5xl md:text-7xl font-bold text-white leading-[1.1] tracking-tight">
                        Keep Your Campus <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-500">
                            in the loop.
                        </span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                        Orbi is the perfect place for <span className="text-white font-semibold">Collage peers</span> Where College Life Comes Together.
                        Build your community in a space designed for real interaction.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                        <Button size="lg" asChild className="rounded-full bg-white text-black hover:scale-105 transition-transform duration-300 font-bold px-8 h-14 text-lg cursor-pointer">
                            <a href="/login">Log In</a>
                        </Button>
                        <Button size="lg" variant="ghost" asChild className="rounded-full text-white hover:bg-white/10 px-8 h-14 text-lg border border-white/20 cursor-pointer">
                            <a href="/signup">Sign Up</a>
                        </Button>
                    </div>
                </div>

                {/* Right: Visual */}
                <div className="relative z-10">
                    <OrbitSystem />
                </div>
            </div>
        </section>
    );
}
