'use client';

import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SignupInputs } from '../schema';
import { motion } from 'framer-motion';

export function StepCredentials() {
    const { register, formState: { errors } } = useFormContext<SignupInputs>();

    return (
        <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            className="space-y-4"
        >
            <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    className="h-12 border-slate-700 bg-slate-950"
                    {...register('email')}
                />
                {errors.email && (
                    <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="h-12 border-slate-700 bg-slate-950"
                    {...register('password')}
                />
                {errors.password && (
                    <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
                <p className="text-xs text-slate-400">
                    Must be at least 6 characters long.
                </p>
            </div>
        </motion.div>
    );
}
