'use client';

import React, { useState } from 'react';
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Smile, Sticker, Image as ImageIcon, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface EmojiManagerProps {
    isOpen: boolean;
    onClose: () => void;
    onEmojiSelect: (emoji: any) => void;
}

export function EmojiManager({ isOpen, onClose, onEmojiSelect }: EmojiManagerProps) {
    const [activeTab, setActiveTab] = useState('emoji');

    // Mock data for GIFs and Stickers
    const gifs = Array(9).fill("https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXNtaWxlc3Rlc3RzdGlja2Vy/3o7TKSjRrfIPjeiVyM/giphy.gif");
    const stickers = Array(9).fill("https://cdn-icons-png.flaticon.com/512/4712/4712109.png");

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop to close on click outside */}
                    <div className="fixed inset-0 z-40" onClick={onClose} />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute bottom-16 left-4 z-50 w-[350px] h-[450px] bg-slate-800 rounded-xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden"
                    >
                        {/* Header / Search */}
                        <div className="p-3 bg-slate-800 border-b border-slate-700">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                                <Input
                                    placeholder={`Search ${activeTab}...`}
                                    className="pl-8 bg-slate-900 border-none text-white placeholder:text-slate-500 h-9"
                                />
                            </div>
                        </div>

                        {/* Tabs Content */}
                        <Tabs defaultValue="emoji" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                            <div className="flex-1 bg-slate-800 relative">
                                <TabsContent value="recent" className="h-full m-0 p-0">
                                    <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                                        No recent items
                                    </div>
                                </TabsContent>

                                <TabsContent value="emoji" className="h-full m-0 p-0">
                                    <div className="h-full [&_.EmojiPickerReact]:!border-none [&_.EmojiPickerReact]:!bg-transparent [&_.EmojiPickerReact]:!w-full [&_.EmojiPickerReact]:!h-full">
                                        <EmojiPicker
                                            theme={Theme.DARK}
                                            emojiStyle={EmojiStyle.APPLE}
                                            onEmojiClick={onEmojiSelect}
                                            lazyLoadEmojis={true}
                                            searchDisabled={true} // We use our own search bar (visual only for now)
                                            skinTonesDisabled
                                            previewConfig={{ showPreview: false }}
                                        />
                                    </div>
                                </TabsContent>

                                <TabsContent value="gif" className="h-full m-0 p-0">
                                    <ScrollArea className="h-full">
                                        <div className="grid grid-cols-3 gap-2 p-2">
                                            {gifs.map((gif, i) => (
                                                <div key={i} className="aspect-square bg-slate-700 rounded-md overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                                                    <img src={gif} alt="GIF" className="w-full h-full object-cover" />
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>

                                <TabsContent value="sticker" className="h-full m-0 p-0">
                                    <ScrollArea className="h-full">
                                        <div className="grid grid-cols-3 gap-2 p-2">
                                            {stickers.map((sticker, i) => (
                                                <div key={i} className="aspect-square bg-slate-700/50 rounded-md flex items-center justify-center cursor-pointer hover:bg-slate-700 transition-colors">
                                                    <img src={sticker} alt="Sticker" className="w-16 h-16 opacity-70" />
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>
                            </div>

                            {/* Bottom Tabs Navigation */}
                            <TabsList className="bg-slate-900 h-12 rounded-none border-t border-slate-700 justify-between px-2">
                                <TabsTrigger value="recent" className="data-[state=active]:bg-transparent data-[state=active]:text-primary text-slate-400 hover:text-slate-200">
                                    <Clock size={20} />
                                </TabsTrigger>
                                <TabsTrigger value="emoji" className="data-[state=active]:bg-transparent data-[state=active]:text-primary text-slate-400 hover:text-slate-200">
                                    <Smile size={20} />
                                </TabsTrigger>
                                <TabsTrigger value="gif" className="data-[state=active]:bg-transparent data-[state=active]:text-primary text-slate-400 hover:text-slate-200">
                                    <div className="font-bold text-xs border border-current rounded px-1">GIF</div>
                                </TabsTrigger>
                                <TabsTrigger value="sticker" className="data-[state=active]:bg-transparent data-[state=active]:text-primary text-slate-400 hover:text-slate-200">
                                    <Sticker size={20} />
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
