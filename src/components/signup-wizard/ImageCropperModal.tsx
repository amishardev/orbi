'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getCroppedImg } from '@/lib/canvasUtils';
import { Loader2 } from 'lucide-react';

interface ImageCropperModalProps {
    imageSrc: string | null;
    aspectRatio: number;
    onCancel: () => void;
    onCropComplete: (croppedBlob: Blob) => void;
    isOpen: boolean;
}

export function ImageCropperModal({ imageSrc, aspectRatio, onCancel, onCropComplete, isOpen }: ImageCropperModalProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const onCropChange = (crop: { x: number; y: number }) => {
        setCrop(crop);
    };

    const onZoomChange = (zoom: number) => {
        setZoom(zoom);
    };

    const onCropCompleteCallback = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        if (!imageSrc || !croppedAreaPixels) return;
        setIsProcessing(true);
        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (croppedImage) {
                onCropComplete(croppedImage);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent className="max-w-xl bg-slate-900 border-slate-800 p-0 overflow-hidden flex flex-col h-[80vh]">
                <DialogHeader className="p-4 border-b border-slate-800">
                    <DialogTitle className="text-white">Adjust Image</DialogTitle>
                </DialogHeader>

                <div className="relative flex-1 bg-black w-full">
                    {imageSrc && (
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={aspectRatio}
                            onCropChange={onCropChange}
                            onCropComplete={onCropCompleteCallback}
                            onZoomChange={onZoomChange}
                        />
                    )}
                </div>

                <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-4">
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-400 font-medium w-12">Zoom</span>
                        <Slider
                            value={[zoom]}
                            min={1}
                            max={3}
                            step={0.1}
                            onValueChange={(value) => setZoom(value[0])}
                            className="flex-1"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onCancel} disabled={isProcessing} className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleSave} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[80px]">
                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
