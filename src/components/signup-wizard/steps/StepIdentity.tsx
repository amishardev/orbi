'use client';

import { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SignupInputs } from '../schema';
import { motion } from 'framer-motion';
import { checkUsernameAvailability } from '@/lib/user-utils';
import { Loader2, Check, X } from 'lucide-react';

export function StepIdentity() {
    const { register, formState: { errors }, watch, setError, clearErrors } = useFormContext<SignupInputs>();
    const username = watch('username');
    const [isChecking, setIsChecking] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

    useEffect(() => {
        if (!username || username.length < 3) {
            setIsAvailable(null);
            return;
        }

        const check = async () => {
            setIsChecking(true);
            const available = await checkUsernameAvailability(username);
            setIsChecking(false);
            setIsAvailable(available);

            if (!available) {
                setError('username', {
                    type: 'manual',
                    message: 'Username is already taken'
                });
            } else {
                clearErrors('username');
            }
        };

        const timeoutId = setTimeout(check, 500);
        return () => clearTimeout(timeoutId);
    }, [username, setError, clearErrors]);

    return (
        <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            className="space-y-4"
        >
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                        id="firstName"
                        placeholder="Max"
                        className="h-12 border-slate-700 bg-slate-950"
                        {...register('firstName')}
                    />
                    {errors.firstName && (
                        <p className="text-sm text-red-500">{errors.firstName.message}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                        id="lastName"
                        placeholder="Robinson"
                        className="h-12 border-slate-700 bg-slate-950"
                        {...register('lastName')}
                    />
                    {errors.lastName && (
                        <p className="text-sm text-red-500">{errors.lastName.message}</p>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                    <Input
                        id="username"
                        placeholder="maxrobinson"
                        className={`h-12 border-slate-700 bg-slate-950 pr-10 ${isAvailable === true ? 'border-green-500 focus-visible:ring-green-500' :
                            isAvailable === false ? 'border-red-500 focus-visible:ring-red-500' : ''
                            }`}
                        {...register('username')}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isChecking ? (
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                        ) : isAvailable === true ? (
                            <Check className="h-4 w-4 text-green-500" />
                        ) : isAvailable === false ? (
                            <X className="h-4 w-4 text-red-500" />
                        ) : null}
                    </div>
                </div>
                {errors.username && (
                    <p className="text-sm text-red-500">{errors.username.message}</p>
                )}
                <p className="text-xs text-slate-400">
                    This will be your unique handle on Orbi.
                </p>
            </div>
        </motion.div>
    );
}
