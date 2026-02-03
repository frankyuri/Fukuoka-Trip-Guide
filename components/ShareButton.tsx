import React, { useState } from 'react';
import { Share2, Link2, Check, QrCode, X } from 'lucide-react';

interface ShareButtonProps {
    dayIndex: number;
    dayTitle: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({ dayIndex, dayTitle }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const getShareUrl = () => {
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?day=${dayIndex}`;
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(getShareUrl());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `福岡之旅 - ${dayTitle}`,
                    text: `查看我的福岡旅遊行程：${dayTitle}`,
                    url: getShareUrl(),
                });
            } catch (err) {
                // User cancelled or error
                console.log('Share cancelled');
            }
        } else {
            setIsOpen(true);
        }
    };

    const handleShareToLine = () => {
        const url = encodeURIComponent(getShareUrl());
        const text = encodeURIComponent(`查看我的福岡旅遊行程：${dayTitle}`);
        window.open(`https://line.me/R/msg/text/?${text}%0A${url}`, '_blank');
    };

    return (
        <div className="relative">
            <button
                onClick={handleNativeShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                title="分享行程"
            >
                <Share2 size={14} />
                <span className="hidden md:inline">分享</span>
            </button>

            {/* Share Modal */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/20 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-gray-800">分享行程</h4>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-2">
                            {/* Copy Link */}
                            <button
                                onClick={handleCopyLink}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${copied
                                        ? 'bg-green-50 border-green-200 text-green-700'
                                        : 'bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                {copied ? <Check size={18} /> : <Link2 size={18} />}
                                <span className="text-sm font-medium">
                                    {copied ? '已複製！' : '複製連結'}
                                </span>
                            </button>

                            {/* LINE Share */}
                            <button
                                onClick={handleShareToLine}
                                className="w-full flex items-center gap-3 p-3 rounded-lg bg-[#00B900] text-white hover:bg-[#00A000] transition-all"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 5.81 2 10.5c0 2.69 1.34 5.09 3.43 6.7.15.11.25.29.25.49l-.05 1.83c-.02.62.52 1.08 1.1.94l2.04-.49c.2-.05.41-.01.59.1.93.5 1.98.78 3.1.78 5.52 0 10-3.81 10-8.5S17.52 2 12 2z" />
                                </svg>
                                <span className="text-sm font-medium">分享到 LINE</span>
                            </button>

                            {/* QR Code hint */}
                            <div className="flex items-center gap-2 p-2 text-xs text-gray-400">
                                <QrCode size={14} />
                                <span>或讓朋友掃描螢幕 QR Code</span>
                            </div>
                        </div>

                        {/* URL Preview */}
                        <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-[10px] text-gray-400 truncate font-mono">
                                {getShareUrl()}
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
