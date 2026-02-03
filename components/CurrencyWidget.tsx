import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

interface ExchangeRate {
    rate: number;
    timestamp: number;
}

export const CurrencyWidget: React.FC = () => {
    const [rate, setRate] = useState<ExchangeRate | null>(null);
    const [loading, setLoading] = useState(true);
    const [twdAmount, setTwdAmount] = useState<string>('1000');
    const [jpyAmount, setJpyAmount] = useState<string>('');
    const [direction, setDirection] = useState<'twd-to-jpy' | 'jpy-to-twd'>('twd-to-jpy');

    useEffect(() => {
        const fetchRate = async () => {
            // Check cache first
            const cached = localStorage.getItem('exchange_rate_twd_jpy');
            if (cached) {
                const parsed = JSON.parse(cached) as ExchangeRate;
                // Use cache if less than 1 hour old
                if (Date.now() - parsed.timestamp < 60 * 60 * 1000) {
                    setRate(parsed);
                    calculateConversion(parsed.rate, 'twd-to-jpy', twdAmount);
                    setLoading(false);
                    return;
                }
            }

            try {
                // Using exchangerate-api.com free tier (or fallback to approximate rate)
                const response = await fetch('https://api.exchangerate-api.com/v4/latest/TWD');
                if (response.ok) {
                    const data = await response.json();
                    const jpyRate = data.rates.JPY; // How many JPY per 1 TWD
                    const newRate: ExchangeRate = { rate: jpyRate, timestamp: Date.now() };
                    localStorage.setItem('exchange_rate_twd_jpy', JSON.stringify(newRate));
                    setRate(newRate);
                    calculateConversion(jpyRate, 'twd-to-jpy', twdAmount);
                } else {
                    throw new Error('API failed');
                }
            } catch {
                // Fallback to approximate rate
                const fallbackRate: ExchangeRate = { rate: 4.7, timestamp: Date.now() };
                setRate(fallbackRate);
                calculateConversion(fallbackRate.rate, 'twd-to-jpy', twdAmount);
            } finally {
                setLoading(false);
            }
        };

        fetchRate();
    }, []);

    const calculateConversion = (currentRate: number, dir: 'twd-to-jpy' | 'jpy-to-twd', amount: string) => {
        const numAmount = parseFloat(amount) || 0;
        if (dir === 'twd-to-jpy') {
            setJpyAmount(Math.round(numAmount * currentRate).toLocaleString());
        } else {
            setTwdAmount(Math.round(numAmount / currentRate).toLocaleString());
        }
    };

    const handleTwdChange = (value: string) => {
        const cleanValue = value.replace(/,/g, '');
        setTwdAmount(cleanValue);
        if (rate) {
            calculateConversion(rate.rate, 'twd-to-jpy', cleanValue);
        }
        setDirection('twd-to-jpy');
    };

    const handleJpyChange = (value: string) => {
        const cleanValue = value.replace(/,/g, '');
        setJpyAmount(cleanValue);
        if (rate) {
            const numAmount = parseFloat(cleanValue) || 0;
            setTwdAmount(Math.round(numAmount / rate.rate).toLocaleString());
        }
        setDirection('jpy-to-twd');
    };

    const refreshRate = async () => {
        setLoading(true);
        localStorage.removeItem('exchange_rate_twd_jpy');
        try {
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/TWD');
            if (response.ok) {
                const data = await response.json();
                const jpyRate = data.rates.JPY;
                const newRate: ExchangeRate = { rate: jpyRate, timestamp: Date.now() };
                localStorage.setItem('exchange_rate_twd_jpy', JSON.stringify(newRate));
                setRate(newRate);
                if (direction === 'twd-to-jpy') {
                    calculateConversion(jpyRate, 'twd-to-jpy', twdAmount);
                } else {
                    calculateConversion(jpyRate, 'jpy-to-twd', jpyAmount);
                }
            }
        } catch {
            // Keep existing rate on error
        } finally {
            setLoading(false);
        }
    };

    if (loading && !rate) {
        return (
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm animate-pulse">
                <div className="h-20 bg-gray-100 rounded"></div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                    💴 匯率換算
                </h3>
                <button
                    onClick={refreshRate}
                    disabled={loading}
                    className="p-1.5 rounded-full hover:bg-emerald-100 transition-colors text-emerald-600"
                    title="更新匯率"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="space-y-3">
                {/* TWD Input */}
                <div className="flex items-center gap-2 bg-white rounded-lg p-2 border border-emerald-100">
                    <span className="text-lg">🇹🇼</span>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={twdAmount}
                        onChange={(e) => handleTwdChange(e.target.value)}
                        className="flex-1 text-right text-lg font-bold text-gray-800 bg-transparent outline-none w-20"
                        placeholder="0"
                    />
                    <span className="text-sm font-medium text-gray-500">TWD</span>
                </div>

                {/* Direction Indicator */}
                <div className="flex justify-center">
                    {direction === 'twd-to-jpy' ? (
                        <TrendingDown size={20} className="text-emerald-500" />
                    ) : (
                        <TrendingUp size={20} className="text-emerald-500" />
                    )}
                </div>

                {/* JPY Input */}
                <div className="flex items-center gap-2 bg-white rounded-lg p-2 border border-emerald-100">
                    <span className="text-lg">🇯🇵</span>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={jpyAmount}
                        onChange={(e) => handleJpyChange(e.target.value)}
                        className="flex-1 text-right text-lg font-bold text-gray-800 bg-transparent outline-none w-20"
                        placeholder="0"
                    />
                    <span className="text-sm font-medium text-gray-500">JPY</span>
                </div>
            </div>

            {/* Rate Info */}
            {rate && (
                <div className="mt-3 pt-3 border-t border-emerald-100 text-xs text-emerald-600 text-center">
                    1 TWD ≈ {rate.rate.toFixed(2)} JPY
                    <span className="text-emerald-400 ml-2">
                        (更新於 {new Date(rate.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })})
                    </span>
                </div>
            )}
        </div>
    );
};
