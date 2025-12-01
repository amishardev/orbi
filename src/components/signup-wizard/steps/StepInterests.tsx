'use client';

import { useFormContext } from 'react-hook-form';
import { SignupInputs } from '../schema';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';

const INTERESTS_LIST = [
    "Coding", "Design", "Music", "Gaming", "Reading",
    "Hiking", "Travel", "Photography", "Cooking", "Fitness",
    "Movies", "Art", "Technology", "Science", "Writing"
];

export function StepInterests() {
    const { setValue, watch } = useFormContext<SignupInputs>();
    const currentInterestsStr = watch('interests') || '';
    const [selectedInterests, setSelectedInterests] = useState<string[]>(
        currentInterestsStr ? currentInterestsStr.split(',').map(s => s.trim()).filter(Boolean) : []
    );

    useEffect(() => {
        setValue('interests', selectedInterests.join(', '));
    }, [selectedInterests, setValue]);

    const toggleInterest = (interest: string) => {
        setSelectedInterests(prev =>
            prev.includes(interest)
                ? prev.filter(i => i !== interest)
                : [...prev, interest]
        );
    };

    return (
        <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            className="space-y-6"
        >
            <div className="text-center space-y-2">
                <h3 className="text-lg font-medium text-white">What are you into?</h3>
                <p className="text-sm text-slate-400">
                    Select a few topics to help us personalize your experience.
                </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
                {INTERESTS_LIST.map((interest) => {
                    const isSelected = selectedInterests.includes(interest);
                    return (
                        <Badge
                            key={interest}
                            variant={isSelected ? "default" : "outline"}
                            className={`
                cursor-pointer px-4 py-2 text-sm rounded-full transition-all
                ${isSelected
                                    ? 'bg-blue-600 hover:bg-blue-700 border-blue-600'
                                    : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                                }
              `}
                            onClick={() => toggleInterest(interest)}
                        >
                            {interest}
                        </Badge>
                    );
                })}
            </div>
        </motion.div>
    );
}
