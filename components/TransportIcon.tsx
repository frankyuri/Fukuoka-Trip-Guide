import React from 'react';
import { Car, Train, Bus, Ship, Footprints, Plane } from 'lucide-react';
import { TransportType } from '../types';

interface TransportIconProps {
    type: TransportType;
    size?: number;
    className?: string;
}

export const TransportIcon: React.FC<TransportIconProps> = ({
    type,
    size = 16,
    className = ''
}) => {
    const iconProps = { size, className };

    switch (type) {
        case TransportType.TAXI:
            return <Car {...iconProps} />;
        case TransportType.TRAIN:
            return <Train {...iconProps} />;
        case TransportType.BUS:
            return <Bus {...iconProps} />;
        case TransportType.SHIP:
            return <Ship {...iconProps} />;
        case TransportType.WALK:
            return <Footprints {...iconProps} />;
        case TransportType.FLIGHT:
            return <Plane {...iconProps} />;
        default:
            return <Car {...iconProps} />;
    }
};

export const getTransportLabel = (type: TransportType): string => {
    switch (type) {
        case TransportType.TAXI: return '計程車';
        case TransportType.TRAIN: return '電車/JR';
        case TransportType.BUS: return '公車';
        case TransportType.SHIP: return '船';
        case TransportType.WALK: return '步行';
        case TransportType.FLIGHT: return '飛機';
        default: return type;
    }
};
