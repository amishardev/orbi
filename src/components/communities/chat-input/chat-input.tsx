'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Smile, Plus, Send } from 'lucide-react';
import { EmojiManager } from './emoji-manager';
import { AttachmentMenu } from './attachment-menu';
import { cn } from '@/lib/utils';

interface ChatInputProps {
    onSendMessage: (text: string) => void;
    onUploadImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    isSending?: boolean;
    replyTo?: { id: string; senderName: string; textPreview: string } | null;
    onCancelReply?: () => void;
}

export function ChatInput({ onSendMessage, onUploadImage, placeholder = "Type a message", isSending = false, replyTo, onCancelReply }: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [isEmojiOpen, setIsEmojiOpen] = useState(false);
    const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSend = () => {
        if (message.trim()) {
            onSendMessage(message);
            setMessage('');
            setIsEmojiOpen(false);
            setIsAttachmentOpen(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleEmojiSelect = (emojiData: any) => {
        setMessage((prev) => prev + emojiData.emoji);
    };

    const triggerImageUpload = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="flex flex-col w-full bg-slate-800 border-t border-slate-700">
            {/* Reply Preview */}
            {replyTo && (
                <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/50">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-1 h-8 bg-primary rounded-full shrink-0" />
                        <div className="flex flex-col text-sm overflow-hidden">
                            <span className="text-primary font-semibold">Replying to {replyTo.senderName}</span>
                            <span className="text-slate-400 truncate">{replyTo.textPreview}</span>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-200" onClick={onCancelReply}>
                        <span className="sr-only">Cancel Reply</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </Button>
                </div>
            )}

            <div className="relative w-full p-3 flex items-center gap-2">
                {/* Hidden File Input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*,video/*"
                    onChange={onUploadImage}
                />

                {/* Attachment Menu & Toggle */}
                <div className="relative">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("text-slate-400 hover:text-slate-200 transition-transform duration-200", isAttachmentOpen && "rotate-45")}
                        onClick={() => setIsAttachmentOpen(!isAttachmentOpen)}
                    >
                        <Plus size={24} />
                    </Button>
                    <AttachmentMenu
                        isOpen={isAttachmentOpen}
                        onClose={() => setIsAttachmentOpen(false)}
                        onUploadImage={triggerImageUpload}
                    />
                </div>

                {/* Input Container */}
                <div className="flex-1 bg-slate-700 rounded-full flex items-center px-4 py-2 gap-2 transition-all focus-within:bg-slate-600">
                    {/* Emoji Toggle */}
                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-8 w-8 text-slate-400 hover:text-slate-200 hover:bg-transparent", isEmojiOpen && "text-primary")}
                            onClick={() => setIsEmojiOpen(!isEmojiOpen)}
                        >
                            <Smile size={24} />
                        </Button>
                        <EmojiManager
                            isOpen={isEmojiOpen}
                            onClose={() => setIsEmojiOpen(false)}
                            onEmojiSelect={handleEmojiSelect}
                        />
                    </div>

                    {/* Text Input */}
                    <Input
                        className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 px-2 h-auto py-1 text-white placeholder:text-slate-400 text-base"
                        placeholder={placeholder}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoComplete="off"
                    />
                </div>

                {/* Send Button */}
                <Button
                    size="icon"
                    className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all duration-200 scale-100"
                    onClick={handleSend}
                    disabled={isSending || !message.trim()}
                >
                    <Send size={20} className="ml-0.5" />
                </Button>
            </div>
        </div>
    );
}
