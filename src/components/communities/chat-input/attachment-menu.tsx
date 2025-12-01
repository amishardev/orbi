'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Camera, FileText, User, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AttachmentMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onUploadImage: () => void;
}

export function AttachmentMenu({ isOpen, onClose, onUploadImage }: AttachmentMenuProps) {
    const menuItems = [
        { icon: ImageIcon, label: 'Photos & Videos', color: 'bg-purple-500', onClick: onUploadImage },
        { icon: Camera, label: 'Camera', color: 'bg-pink-500', onClick: () => { } },
        { icon: FileText, label: 'Document', color: 'bg-indigo-500', onClick: () => { } },
        { icon: User, label: 'Contact', color: 'bg-blue-500', onClick: () => { } },
        { icon: BarChart2, label: 'Poll', color: 'bg-teal-500', onClick: () => { } },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={onClose} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="absolute bottom-16 left-0 z-50 flex flex-col gap-4 p-4 mb-2"
                    >
                        {menuItems.map((item, index) => (
                            <motion.div
                                key={item.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="flex items-center gap-3 group cursor-pointer"
                                onClick={() => {
                                    item.onClick();
                                    onClose();
                                }}
                            >
                                <div className={`w-12 h-12 rounded-full ${item.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                                    <item.icon className="text-white h-6 w-6" />
                                </div>
                                {/* Tooltip-like label */}
                                <span className="bg-slate-800 text-white text-sm px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                                    {item.label}
                                </span>
                            </motion.div>
                        ))}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
