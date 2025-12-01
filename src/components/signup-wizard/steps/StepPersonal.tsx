'use client';

import { useFormContext, Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { SignupInputs } from '../schema';
import { motion } from 'framer-motion';

export function StepPersonal() {
    const { control } = useFormContext<SignupInputs>();

    return (
        <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            className="space-y-4"
        >
            <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Controller
                    name="gender"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger id="gender" className="h-12 border-slate-700 bg-slate-950">
                                <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="relationshipStatus">Relationship Status</Label>
                <Controller
                    name="relationshipStatus"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger id="relationshipStatus" className="h-12 border-slate-700 bg-slate-950">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="single">Single</SelectItem>
                                <SelectItem value="in-a-relationship">In a relationship</SelectItem>
                                <SelectItem value="engaged">Engaged</SelectItem>
                                <SelectItem value="married">Married</SelectItem>
                                <SelectItem value="complicated">It's complicated</SelectItem>
                                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>
        </motion.div>
    );
}
