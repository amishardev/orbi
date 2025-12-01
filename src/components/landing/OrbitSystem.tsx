'use client';

import { motion } from 'framer-motion';

export function OrbitSystem() {
    return (
        <div className="relative w-full h-[500px] flex items-center justify-center">
            {/* Central Icon */}
            <div className="absolute z-20">
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 via-pink-500 to-orange-400 shadow-[0_0_30px_rgba(236,72,153,0.6)] flex items-center justify-center">
                    <div className="w-full h-full bg-[url('/logo-splash.svg')] bg-no-repeat bg-center bg-[length:60%]" />
                </div>
            </div>

            {/* Rings */}
            {[1, 2, 3].map((ring, i) => (
                <motion.div
                    key={ring}
                    className="absolute border border-white/10 rounded-full"
                    style={{
                        width: `${(i + 1) * 180}px`,
                        height: `${(i + 1) * 180}px`,
                    }}
                    animate={{ rotate: 360 }}
                    transition={{
                        duration: 20 + i * 10,
                        repeat: Infinity,
                        ease: "linear",
                        repeatType: "loop"
                    }}
                >
                    {/* Satellites */}
                    <motion.div
                        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                        style={{ transformOrigin: '50% 50%' }}
                    />
                </motion.div>
            ))}

            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 via-transparent to-orange-500/10 blur-3xl rounded-full" />
        </div>
    );
}
