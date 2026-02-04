import React, { useState } from 'react';
import {
    Phone,
    Building2,
    AlertTriangle,
    MapPin,
    Copy,
    Check,
    ChevronDown,
    ChevronUp,
    Shield,
    Stethoscope,
    CreditCard,
    Plane
} from 'lucide-react';

interface EmergencyContact {
    label: string;
    number: string;
    description?: string;
    icon: React.ReactNode;
    color: string;
}

const emergencyContacts: EmergencyContact[] = [
    {
        label: '日本緊急救助',
        number: '110',
        description: '警察 (Police)',
        icon: <Shield size={18} />,
        color: 'blue'
    },
    {
        label: '火災 / 急救',
        number: '119',
        description: '消防、救護車',
        icon: <Stethoscope size={18} />,
        color: 'red'
    },
    {
        label: '台北駐日經濟文化代表處 (福岡)',
        number: '+81-92-734-2810',
        description: '週一至週五 9:00-12:00, 13:00-18:00',
        icon: <Building2 size={18} />,
        color: 'emerald'
    },
    {
        label: '急難救助專線 (24小時)',
        number: '+81-90-3188-6519',
        description: '僅限緊急情況使用',
        icon: <AlertTriangle size={18} />,
        color: 'orange'
    },
    {
        label: '信用卡掛失 (Visa)',
        number: '00531-44-0022',
        description: '免費專線',
        icon: <CreditCard size={18} />,
        color: 'purple'
    },
    {
        label: '信用卡掛失 (Mastercard)',
        number: '00531-11-3886',
        description: '免費專線',
        icon: <CreditCard size={18} />,
        color: 'purple'
    },
];

const hotelInfo = {
    name: 'Hotel WBF Grande Hakata',
    nameJp: 'ホテルWBFグランデ博多',
    address: '福岡市博多区博多駅南 2-2-5',
    phone: '+81-92-433-3900',
    checkIn: '15:00',
    checkOut: '10:00'
};

export const EmergencyInfo: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [copiedItem, setCopiedItem] = useState<string | null>(null);

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopiedItem(label);
        setTimeout(() => setCopiedItem(null), 2000);
    };

    const getColorClasses = (color: string) => {
        const colors: Record<string, { bg: string; text: string; border: string }> = {
            blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
            red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' },
            emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
            orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
            purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
        };
        return colors[color] || colors.blue;
    };

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header - Always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                        <AlertTriangle size={20} className="text-red-600" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-gray-800">緊急聯絡資訊</h3>
                        <p className="text-xs text-gray-500">駐日代表處、緊急電話、飯店資訊</p>
                    </div>
                </div>
                {isExpanded ? (
                    <ChevronUp size={20} className="text-gray-400" />
                ) : (
                    <ChevronDown size={20} className="text-gray-400" />
                )}
            </button>

            {/* Expandable Content */}
            {isExpanded && (
                <div className="p-4 pt-0 space-y-4 animate-in fade-in slide-in-from-top-2">
                    {/* Hotel Info Card */}
                    <div className="bg-gradient-to-r from-primary-50 to-indigo-50 rounded-xl p-4 border border-primary-100">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Plane size={16} className="text-primary-600" />
                                <span className="text-xs font-bold text-primary-700 uppercase tracking-wider">住宿飯店</span>
                            </div>
                            <button
                                onClick={() => handleCopy(hotelInfo.address, 'hotel')}
                                className="p-1.5 rounded-md hover:bg-primary-100 transition-colors"
                                title="複製地址"
                            >
                                {copiedItem === 'hotel' ? (
                                    <Check size={14} className="text-green-600" />
                                ) : (
                                    <Copy size={14} className="text-primary-400" />
                                )}
                            </button>
                        </div>
                        <h4 className="font-bold text-gray-800 mb-1">{hotelInfo.name}</h4>
                        <p className="text-xs text-gray-500 mb-2">{hotelInfo.nameJp}</p>
                        <div className="flex items-start gap-1.5 text-xs text-gray-600 mb-2">
                            <MapPin size={12} className="mt-0.5 flex-shrink-0 text-primary-500" />
                            <span className="font-mono">{hotelInfo.address}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-3">
                            <Phone size={12} className="text-primary-500" />
                            <a href={`tel:${hotelInfo.phone}`} className="font-mono hover:text-primary-600">
                                {hotelInfo.phone}
                            </a>
                        </div>
                        <div className="flex gap-4 text-xs">
                            <span className="bg-white px-2 py-1 rounded-md border border-primary-100">
                                Check-in: <strong>{hotelInfo.checkIn}</strong>
                            </span>
                            <span className="bg-white px-2 py-1 rounded-md border border-primary-100">
                                Check-out: <strong>{hotelInfo.checkOut}</strong>
                            </span>
                        </div>
                    </div>

                    {/* Emergency Contacts Grid */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">緊急電話</h4>
                        <div className="grid gap-2">
                            {emergencyContacts.map((contact, index) => {
                                const colors = getColorClasses(contact.color);
                                return (
                                    <div
                                        key={index}
                                        className={`flex items-center justify-between p-3 rounded-lg border ${colors.border} ${colors.bg}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={colors.text}>
                                                {contact.icon}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">{contact.label}</p>
                                                {contact.description && (
                                                    <p className="text-[10px] text-gray-500">{contact.description}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={`tel:${contact.number}`}
                                                className={`font-mono text-sm font-bold ${colors.text} hover:underline`}
                                            >
                                                {contact.number}
                                            </a>
                                            <button
                                                onClick={() => handleCopy(contact.number, contact.label)}
                                                className="p-1.5 rounded-md hover:bg-white/50 transition-colors"
                                            >
                                                {copiedItem === contact.label ? (
                                                    <Check size={14} className="text-green-600" />
                                                ) : (
                                                    <Copy size={14} className={colors.text} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tip */}
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800">
                        <strong>💡 小提醒：</strong> 在日本撥打緊急電話時，盡量用簡單英語或準備好翻譯 App。若需要中文服務，可先撥打駐日代表處。
                    </div>
                </div>
            )}
        </div>
    );
};
