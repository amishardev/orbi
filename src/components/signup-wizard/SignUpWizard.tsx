'use client';

import { useState } from 'react';
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { uploadPhoto } from '@/app/actions/upload';
import { signupSchema, SignupInputs } from './schema';
import { checkUsernameAvailability } from '@/lib/user-utils';
import Link from 'next/link';
import { OnboardingLoader } from './OnboardingLoader';

// Steps
import { StepIdentity } from './steps/StepIdentity';
import { StepCredentials } from './steps/StepCredentials';
import { StepPersonal } from './steps/StepPersonal';
import { StepInterests } from './steps/StepInterests';
import { StepBranding } from './steps/StepBranding';

const TOTAL_STEPS = 5;

export function SignUpWizard() {
    const [step, setStep] = useState(1);
    const [profileFile, setProfileFile] = useState<File | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [profileUrl, setProfileUrl] = useState<string | null>(null);
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const [isNavigating, setIsNavigating] = useState(false);

    // Loader State
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingStatus, setLoadingStatus] = useState('');
    const [showLoader, setShowLoader] = useState(false);

    const { signUpWithEmail } = useAuth();
    const { toast } = useToast();

    const methods = useForm<SignupInputs>({
        resolver: zodResolver(signupSchema),
        mode: 'onChange',
    });

    const { handleSubmit, trigger, watch, setError, formState: { isSubmitting, isValid, errors } } = methods;
    const username = watch('username');

    const handleNext = async () => {
        if (isNavigating) return;

        let fieldsToValidate: (keyof SignupInputs)[] = [];

        switch (step) {
            case 1:
                fieldsToValidate = ['firstName', 'lastName', 'username'];
                break;
            case 2:
                fieldsToValidate = ['email', 'password'];
                break;
            case 3:
                fieldsToValidate = ['gender', 'relationshipStatus'];
                break;
            case 4:
                fieldsToValidate = ['interests'];
                break;
            case 5:
                // Final step submission handled by onSubmit
                return;
        }

        const isStepValid = await trigger(fieldsToValidate);

        // Extra check for Step 1: Username Availability
        if (step === 1 && isStepValid) {
            const isAvailable = await checkUsernameAvailability(username);
            if (!isAvailable) {
                setError('username', {
                    type: 'manual',
                    message: 'Username is already taken'
                });
                return; // Stop here
            }
        }

        if (isStepValid) {
            setIsNavigating(true);
            setStep(prev => Math.min(prev + 1, TOTAL_STEPS));
            setTimeout(() => setIsNavigating(false), 500);
        }
    };

    const handleBack = () => {
        if (isNavigating) return;
        setIsNavigating(true);
        setStep(prev => Math.max(prev - 1, 1));
        setTimeout(() => setIsNavigating(false), 500);
    };

    const onFinalSubmit: SubmitHandler<SignupInputs> = async (data) => {
        let finalProfileUrl: string | undefined = profileUrl || undefined;
        let finalCoverUrl: string | undefined = coverUrl || undefined;

        setShowLoader(true);
        setLoadingProgress(10);
        setLoadingStatus('Initializing...');

        try {
            console.log("Starting signup submission...");

            if (profileFile) {
                setLoadingStatus('Uploading Profile Picture...');
                setLoadingProgress(30);
                console.log("Uploading profile picture...", profileFile.name, profileFile.type);
                const formData = new FormData();
                formData.append('photo', profileFile);
                const res = await uploadPhoto(formData, { folder: 'orbi-profiles' });
                if (res.error) {
                    console.error("Profile upload error:", res.error);
                    throw new Error(`Profile image upload failed: ${res.error}`);
                }
                console.log("Profile uploaded successfully:", res.url);
                finalProfileUrl = res.url;
            } else if (profileUrl) {
                console.log("Using selected GIF for profile:", profileUrl);
            } else {
                console.log("No profile picture selected.");
            }

            if (coverFile) {
                setLoadingStatus('Uploading Cover Photo...');
                setLoadingProgress(60);
                console.log("Uploading cover photo...", coverFile.name, coverFile.type);
                const formData = new FormData();
                formData.append('photo', coverFile);
                const res = await uploadPhoto(formData, { folder: 'orbi-covers' });
                if (res.error) {
                    console.error("Cover upload error:", res.error);
                    throw new Error(`Cover image upload failed: ${res.error}`);
                }
                console.log("Cover uploaded successfully:", res.url);
                finalCoverUrl = res.url;
            } else if (coverUrl) {
                console.log("Using selected GIF for cover:", coverUrl);
            } else {
                console.log("No cover photo selected.");
            }

            setLoadingStatus('Creating Account...');
            setLoadingProgress(80);

            await signUpWithEmail({
                email: data.email,
                password: data.password,
                username: data.username,
                displayName: `${data.firstName} ${data.lastName}`,
                interests: data.interests,
                relationshipStatus: data.relationshipStatus,
                profilePictureUrl: finalProfileUrl,
                coverPhotoUrl: finalCoverUrl,
            });

            setLoadingProgress(100);
            setLoadingStatus('Welcome to Orbi!');

        } catch (error: any) {
            console.error("Signup error:", error);
            setShowLoader(false);
            let description = error.message || 'An unexpected error occurred.';
            if (error.code === 'auth/username-already-in-use') {
                description = 'This username is already taken. Please choose another one.';
            } else if (error.code === 'auth/email-already-in-use') {
                description = 'This email is already registered. Please login instead.';
            }
            toast({
                variant: 'destructive',
                title: 'Sign Up Failed',
                description: description,
            });
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background py-8 px-4">
            {showLoader && <OnboardingLoader progress={loadingProgress} status={loadingStatus} />}

            <Card className="mx-auto max-w-md w-full overflow-hidden border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                {/* ... (rest of the component) */}
                {/* Progress Bar */}
                <div className="w-full h-1 bg-slate-800">
                    <motion.div
                        className="h-full bg-blue-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>

                <CardHeader className="space-y-1">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-xl font-bold">
                            {step === 1 && "Let's get started"}
                            {step === 2 && "Secure your account"}
                            {step === 3 && "Tell us about you"}
                            {step === 4 && "Your interests"}
                            {step === 5 && "Final touches"}
                        </CardTitle>
                        <span className="text-xs font-medium text-slate-500">
                            Step {step} of {TOTAL_STEPS}
                        </span>
                    </div>
                    <CardDescription>
                        {step === 1 && "First, tell us who you are."}
                        {step === 2 && "Create your login credentials."}
                        {step === 3 && "Help us personalize your profile."}
                        {step === 4 && "What topics do you enjoy?"}
                        {step === 5 && "Add a profile picture and banner."}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <FormProvider {...methods}>
                        <form
                            onSubmit={(e) => {
                                if (step < TOTAL_STEPS) {
                                    e.preventDefault();
                                    handleNext();
                                } else {
                                    handleSubmit(onFinalSubmit)(e);
                                }
                            }}
                            className="space-y-6"
                        >
                            <div className="min-h-[300px]">
                                <AnimatePresence mode="wait">
                                    {step === 1 && <StepIdentity key="step1" />}
                                    {step === 2 && <StepCredentials key="step2" />}
                                    {step === 3 && <StepPersonal key="step3" />}
                                    {step === 4 && <StepInterests key="step4" />}
                                    {step === 5 && (
                                        <StepBranding
                                            key="step5"
                                            setProfileFile={setProfileFile}
                                            setCoverFile={setCoverFile}
                                            setProfileUrl={setProfileUrl}
                                            setCoverUrl={setCoverUrl}
                                        />
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="flex gap-3 pt-4">
                                {step > 1 && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleBack}
                                        className="w-1/3 border-slate-700 hover:bg-slate-800"
                                        disabled={isSubmitting || isNavigating}
                                    >
                                        Back
                                    </Button>
                                )}

                                {step < TOTAL_STEPS ? (
                                    <Button
                                        type="button"
                                        onClick={handleNext}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                        disabled={isSubmitting || isNavigating || (step === 1 && !!errors.username)}
                                    >
                                        Next Step
                                    </Button>
                                ) : (
                                    <Button
                                        type="submit"
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                        disabled={isSubmitting || isNavigating}
                                    >
                                        {isSubmitting ? 'Creating Account...' : 'Create Account'}
                                    </Button>
                                )}
                            </div>
                        </form>
                    </FormProvider>

                    <div className="mt-6 text-center text-sm text-slate-500">
                        Already have an account?{' '}
                        <Link href="/login" className="text-blue-500 hover:underline font-medium">
                            Sign in
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
